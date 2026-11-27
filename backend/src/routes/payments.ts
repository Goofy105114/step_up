import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import pool, { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createRazorpayOrder, fetchRazorpayPayment, fetchRazorpayOrderPayments, verifyCheckoutSignature, verifyWebhookSignature } from '../services/razorpay';

const router = Router();

const validateOptionalBillingAddress = (billingAddress: any) => {
  if (billingAddress === undefined || billingAddress === null) return;
  if (typeof billingAddress !== 'object' || Array.isArray(billingAddress)) {
    throw new AppError('Billing address must be a valid address object', 400);
  }
  const requiredFields = ['full_name', 'phone', 'line1', 'city', 'state', 'postal_code'];
  if (requiredFields.some(field =>
    typeof billingAddress[field] !== 'string' || !billingAddress[field].trim()
  )) {
    throw new AppError('Complete all required billing address fields', 400);
  }
  if (
    billingAddress.full_name.trim().length > 200 ||
    billingAddress.phone.trim().length > 20 ||
    billingAddress.line1.trim().length > 255 ||
    (billingAddress.line2 !== undefined && billingAddress.line2 !== null &&
      (typeof billingAddress.line2 !== 'string' || billingAddress.line2.trim().length > 255)) ||
    billingAddress.city.trim().length > 100 ||
    billingAddress.state.trim().length > 100 ||
    (billingAddress.country !== undefined &&
      (typeof billingAddress.country !== 'string' || billingAddress.country.trim().length > 100)) ||
    (billingAddress.email !== undefined &&
      (typeof billingAddress.email !== 'string' || billingAddress.email.trim().length > 255))
  ) {
    throw new AppError('One or more billing address fields exceed the allowed length', 400);
  }
  const phone = billingAddress.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new AppError('Enter a valid Indian billing mobile number', 400);
  }
  if (!/^\d{6}$/.test(billingAddress.postal_code.trim())) {
    throw new AppError('Enter a valid 6-digit Indian billing PIN code', 400);
  }
  if (String(billingAddress.country || 'India').trim().toLowerCase() !== 'india') {
    throw new AppError('STEPUP currently accepts billing addresses within India only', 400);
  }
};

router.post('/create-order', authenticate, async (req: Request, res: Response) => {
  const address = req.body?.shipping_address;
  validateOptionalBillingAddress(req.body?.billing_address);
  const required = ['full_name','phone','line1','city','state','postal_code'];
  if (!address || required.some((key) => !String(address[key] || '').trim()) ||
      !/^[6-9]\d{9}$/.test(String(address.phone).replace(/\D/g,'').replace(/^91(?=\d{10}$)/,'')) ||
      !/^\d{6}$/.test(String(address.postal_code).trim()) ||
      String(address.country || 'India').toLowerCase() !== 'india') {
    throw new AppError('Enter a complete valid Indian delivery address', 400);
  }

  const client = await pool.connect();
  let order: any;
  try {
    await client.query('BEGIN');
    const cart = await client.query('SELECT id FROM carts WHERE user_id=$1 ORDER BY created_at ASC LIMIT 1 FOR UPDATE',[req.user!.userId]);
    if (!cart.rows[0]) throw new AppError('Cart is empty',400);
    const items = await client.query(`SELECT ci.*, COALESCE(p.sale_price,p.base_price)+pv.price_adj AS unit_price,
      p.name,pv.size,pv.color,pv.stock_qty,(SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS image_url
      FROM cart_items ci JOIN products p ON ci.product_id=p.id AND p.is_active=true
      JOIN product_variants pv ON ci.variant_id=pv.id AND pv.product_id=p.id
      WHERE ci.cart_id=$1 FOR UPDATE OF pv`,[cart.rows[0].id]);
    const count = await client.query('SELECT COUNT(*) FROM cart_items WHERE cart_id=$1',[cart.rows[0].id]);
    if (!items.rows.length || Number(count.rows[0].count)!==items.rows.length) throw new AppError('Cart contains unavailable products',409);
    for (const item of items.rows) if (Number(item.stock_qty)<Number(item.quantity)) throw new AppError(`Insufficient stock for ${item.name}`,409);
    const subtotal=items.rows.reduce((sum:number,item:any)=>sum+Number(item.unit_price)*Number(item.quantity),0);
    let discount=0, couponId:string|null=null;
    const couponCode=String(req.body?.coupon_code||'').trim().toUpperCase();
    if(couponCode){
      const couponResult=await client.query(`SELECT * FROM coupons WHERE code=$1 AND is_active=true
        AND valid_from<=NOW() AND (valid_until IS NULL OR valid_until>NOW())
        AND (max_uses IS NULL OR used_count<max_uses) AND (user_id IS NULL OR user_id=$2) FOR UPDATE`,[couponCode,req.user!.userId]);
      const coupon=couponResult.rows[0];
      if(!coupon||subtotal<Number(coupon.min_order_amount)) throw new AppError('Coupon is invalid, expired, or does not meet the minimum order amount',400);
      const couponValue=Number(coupon.discount_value);
      const minimumOrderAmount=Number(coupon.min_order_amount);
      if(!Number.isFinite(couponValue)||couponValue<=0||!Number.isFinite(minimumOrderAmount)||minimumOrderAmount<0||
        !['percentage','fixed'].includes(coupon.discount_type)||(coupon.discount_type==='percentage'&&couponValue>100)) {
        throw new AppError('This coupon is not configured correctly. Please contact support.',503);
      }
      couponId=coupon.id;
      discount=coupon.discount_type==='percentage'?subtotal*couponValue/100:couponValue;
      discount=Math.min(discount,subtotal);
    }
    const pricingResult = await client.query(
      "SELECT setting_value FROM store_settings WHERE setting_key='checkout_pricing' FOR SHARE"
    );
    const pricing = pricingResult.rows[0]?.setting_value;
    const freeShippingThreshold = Number(pricing?.free_shipping_threshold_inr);
    const shippingFee = Number(pricing?.shipping_fee_inr);
    const gstRatePercent = Number(pricing?.gst_rate_percent);
    if (
      !Number.isFinite(freeShippingThreshold) || freeShippingThreshold < 0 ||
      !Number.isFinite(shippingFee) || shippingFee < 0 ||
      !Number.isFinite(gstRatePercent) || gstRatePercent < 0 || gstRatePercent > 100
    ) {
      throw new AppError('Checkout pricing is not configured correctly. Please contact support.', 503);
    }
    const taxableAmount = Math.max(0, subtotal - discount);
    const shipping = taxableAmount >= freeShippingThreshold ? 0 : shippingFee;
    const tax = taxableAmount * (gstRatePercent / 100);
    const total = taxableAmount + shipping + tax;
    const orderNo='ORD-'+Date.now()+'-'+randomBytes(8).toString('hex');
    const billingAddress = req.body?.billing_address ?? address;
    const inserted=await client.query(`INSERT INTO orders (order_number,user_id,subtotal,discount_amount,shipping_amount,tax_amount,total_amount,coupon_id,shipping_address,billing_address,payment_method,payment_status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'razorpay','pending') RETURNING *`,
      [orderNo,req.user!.userId,subtotal,discount,shipping,tax,total,couponId,JSON.stringify(address),JSON.stringify(billingAddress)]);
    order=inserted.rows[0];
    for (const item of items.rows) {
      const stock=await client.query('UPDATE product_variants SET stock_qty=stock_qty-$1 WHERE id=$2 AND stock_qty >= $1 RETURNING id',[item.quantity,item.variant_id]);
      if (stock.rowCount!==1) throw new AppError('Stock changed while creating your order. Please retry.',409);
      await client.query(`INSERT INTO order_items (order_id,product_id,variant_id,product_name,size,color,quantity,unit_price,total_price,image_url)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [order.id,item.product_id,item.variant_id,item.name,item.size,item.color,item.quantity,item.unit_price,Number(item.unit_price)*Number(item.quantity),item.image_url]);
    }
    await client.query('INSERT INTO order_status_history (order_id,status,note) VALUES ($1,$2,$3)',[order.id,'pending','Awaiting online payment confirmation']);
    if(couponId) await client.query('UPDATE coupons SET used_count=used_count+1 WHERE id=$1',[couponId]);
    await client.query('COMMIT');
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }

  try {
    const rp=await createRazorpayOrder(Number(order.total_amount),order.order_number,{order_id:order.id,user_id:req.user!.userId});
    await query('UPDATE orders SET payment_intent_id=$1 WHERE id=$2',[rp.id,order.id]);
    return res.status(201).json({success:true,data:{order_id:order.id,order_number:order.order_number,razorpay_order_id:rp.id,amount:rp.amount,currency:rp.currency,key_id:rp.keyId}});
  } catch(error) {
    const cleanup=await pool.connect();
    try {
      await cleanup.query('BEGIN');
      const items=await cleanup.query('SELECT variant_id,quantity FROM order_items WHERE order_id=$1',[order.id]);
      for (const item of items.rows) {
        const restored = await cleanup.query(
          'UPDATE product_variants SET stock_qty=stock_qty+$1 WHERE id=$2 RETURNING id',
          [item.quantity, item.variant_id]
        );
        if (restored.rowCount !== 1) {
          throw new AppError('Payment setup failed and reserved stock could not be fully released. Contact support to reconcile inventory.', 409);
        }
      }
      await cleanup.query("UPDATE orders SET status='cancelled',payment_status='failed' WHERE id=$1 AND payment_status='pending'",[order.id]);
      if(order.coupon_id) await cleanup.query('UPDATE coupons SET used_count=GREATEST(0,used_count-1) WHERE id=$1',[order.coupon_id]);
      await cleanup.query('INSERT INTO order_status_history (order_id,status,note) VALUES ($1,$2,$3)',[order.id,'cancelled','Payment session creation failed; reserved stock released']);
      await cleanup.query('COMMIT');
    } catch { await cleanup.query('ROLLBACK'); } finally { cleanup.release(); }
    throw error;
  }
});

router.post('/cancel', authenticate, async (req: Request, res: Response) => {
  const orderId = String(req.body?.order_id || '');
  const found = await query('SELECT * FROM orders WHERE id=$1 AND user_id=$2 AND payment_method=$3',[orderId,req.user!.userId,'razorpay']);
  const order=found.rows[0];
  if(!order) throw new AppError('Payment order not found',404);
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const locked=await client.query('SELECT * FROM orders WHERE id=$1 AND user_id=$2 FOR UPDATE',[order.id,req.user!.userId]);
    const current=locked.rows[0];
    if(!current) throw new AppError('Payment order not found',404);
    if(current.payment_status==='paid') throw new AppError('This order is already paid and cannot be cancelled here',409);
    if(current.status==='cancelled' || current.payment_status==='failed'){
      await client.query('COMMIT');
      return res.json({success:true});
    }
    if(current.payment_status==='pending' && current.payment_intent_id){
      // Re-check provider state while holding the order lock. The initial lookup alone
      // is not sufficient: a payment can become authorized/captured while cancellation waits.
      const payments=await fetchRazorpayOrderPayments(current.payment_intent_id);
      if(payments.some((payment:any)=>['authorized','captured'].includes(payment.status))) {
        throw new AppError('A payment is already authorized or captured. Refresh your orders before retrying.',409);
      }
    }
    if(current.payment_status==='pending'){
      const items=await client.query('SELECT variant_id,quantity FROM order_items WHERE order_id=$1',[current.id]);
      for (const item of items.rows) {
        const restored = await client.query(
          'UPDATE product_variants SET stock_qty=stock_qty+$1 WHERE id=$2 RETURNING id',
          [item.quantity, item.variant_id]
        );
        if (restored.rowCount !== 1) {
          throw new AppError('Cannot cancel this payment because an ordered product variant is missing. Contact support to reconcile inventory.', 409);
        }
      }
      await client.query("UPDATE orders SET status='cancelled',payment_status='failed',updated_at=NOW() WHERE id=$1 AND payment_status='pending'",[current.id]);
      if(current.coupon_id) await client.query('UPDATE coupons SET used_count=GREATEST(0,used_count-1) WHERE id=$1',[current.coupon_id]);
      await client.query('INSERT INTO order_status_history (order_id,status,note) VALUES ($1,$2,$3)',[current.id,'cancelled','Customer closed the payment window; reserved stock released']);
    }
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  return res.json({success:true});
});

router.post('/verify', authenticate, async (req: Request,res: Response) => {
  const {razorpay_order_id,razorpay_payment_id,razorpay_signature}=req.body||{};
  if (![razorpay_order_id,razorpay_payment_id,razorpay_signature].every((v:unknown)=>typeof v==='string'&&v.length>0)) throw new AppError('Payment verification details are incomplete',400);
  const found=await query('SELECT * FROM orders WHERE payment_intent_id=$1 AND user_id=$2',[razorpay_order_id,req.user!.userId]);
  const order=found.rows[0];
  if(!order) throw new AppError('Payment order not found',404);
  if(order.payment_status==='paid') return res.json({success:true,data:{order_number:order.order_number,payment_status:'paid'}});
  if(!verifyCheckoutSignature(razorpay_order_id,razorpay_payment_id,razorpay_signature)) throw new AppError('Payment signature verification failed',400);
  const payment=await fetchRazorpayPayment(razorpay_payment_id);
  if(payment.order_id!==razorpay_order_id||payment.status!=='captured'||Number(payment.amount)!==Math.round(Number(order.total_amount)*100)||payment.currency!=='INR') throw new AppError('Payment is not captured for the expected order amount',409);
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const locked=await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[order.id]);
    const current=locked.rows[0];
    if(current.payment_status!=='paid'){
      if(current.status==='cancelled'){
        await client.query("UPDATE orders SET payment_status='paid',updated_at=NOW() WHERE id=$1",[order.id]);
        await client.query('INSERT INTO order_status_history (order_id,status,note) VALUES ($1,$2,$3)',[order.id,'cancelled','Payment was captured after the order was cancelled. Manual refund review is required; fulfilment remains cancelled.']);
      } else {
        await client.query("UPDATE orders SET payment_status='paid',status='confirmed',updated_at=NOW() WHERE id=$1",[order.id]);
        await client.query('INSERT INTO order_status_history (order_id,status,note) VALUES ($1,$2,$3)',[order.id,'confirmed','Razorpay payment captured and verified']);
        await client.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id=$1)',[req.user!.userId]);
      }
    }
    await client.query('COMMIT');
  } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
  return res.json({success:true,data:{order_number:order.order_number,payment_status:'paid'}});
});

router.post('/webhook',async(req:Request,res:Response)=>{
  const raw=Buffer.isBuffer(req.body)?req.body:Buffer.from('');
  if(!verifyWebhookSignature(raw,req.headers['x-razorpay-signature'] as string|undefined)) return res.status(400).json({error:'Webhook signature verification failed'});
  let event: any;
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.status(400).json({error:'Invalid webhook payload'});
  }
  if(event?.event==='payment.captured'){
    const payment=event.payload?.payment?.entity;
    if(
      payment && typeof payment.id==='string' && payment.id.length>0 &&
      typeof payment.order_id==='string' && payment.order_id.length>0 &&
      payment.status==='captured' &&
      Number.isSafeInteger(payment.amount) && payment.amount>0 &&
      payment.currency==='INR'
    ){
      const found=await query('SELECT * FROM orders WHERE payment_intent_id=$1',[payment.order_id]);
      const order=found.rows[0];
      if(order&&Number(payment.amount)===Math.round(Number(order.total_amount)*100)){
        const client=await pool.connect();
        try{
          await client.query('BEGIN');
          const locked=await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[order.id]);
          const current=locked.rows[0];
          if(current && current.payment_status!=='paid'){
            if(current.status==='cancelled'){
              await client.query("UPDATE orders SET payment_status='paid',updated_at=NOW() WHERE id=$1",[order.id]);
              await client.query('INSERT INTO order_status_history (order_id,status,note) VALUES ($1,$2,$3)',[order.id,'cancelled','Razorpay captured payment after order cancellation. Manual refund review is required; fulfilment remains cancelled.']);
            } else {
              await client.query("UPDATE orders SET payment_status='paid',status='confirmed',updated_at=NOW() WHERE id=$1",[order.id]);
              await client.query('INSERT INTO order_status_history (order_id,status,note) VALUES ($1,$2,$3)',[order.id,'confirmed','Razorpay payment captured via verified webhook']);
              await client.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id=$1)',[order.user_id]);
            }
          }
          await client.query('COMMIT');
        }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
      }
    }
  }
  return res.json({received:true});
});

router.post('/validate-coupon', authenticate, async (req: Request, res: Response) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  if (!code || code.length > 64) throw new AppError('Enter a valid coupon code', 400);
  const cart = await query(
    `SELECT COALESCE(SUM((COALESCE(p.sale_price,p.base_price)+pv.price_adj)*ci.quantity),0) AS subtotal
     FROM carts c
     JOIN cart_items ci ON ci.cart_id=c.id
     JOIN products p ON p.id=ci.product_id AND p.is_active=true
     JOIN product_variants pv ON pv.id=ci.variant_id AND pv.product_id=p.id
     WHERE c.user_id=$1`,
    [req.user!.userId]
  );
  const subtotal = Number(cart.rows[0]?.subtotal || 0);
  if (!Number.isFinite(subtotal) || subtotal <= 0) throw new AppError('Add available products to your cart before applying a coupon', 400);
  const result = await query(
    `SELECT * FROM coupons
     WHERE UPPER(code)=UPPER($1) AND is_active=true AND valid_from<=NOW()
       AND (valid_until IS NULL OR valid_until>NOW())
       AND (max_uses IS NULL OR used_count<max_uses)
       AND (user_id IS NULL OR user_id=$2)
     LIMIT 1`,
    [code, req.user!.userId]
  );
  const coupon = result.rows[0];
  if (!coupon) throw new AppError('Invalid, expired, or unavailable coupon code', 404);
  if (subtotal < Number(coupon.min_order_amount)) throw new AppError(`Minimum cart value for this coupon is ₹${coupon.min_order_amount}`, 400);
  const value = Number(coupon.discount_value);
  const minimumOrderAmount = Number(coupon.min_order_amount);
  if (
    !Number.isFinite(value) || value <= 0 ||
    !Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0 ||
    !['percentage', 'fixed'].includes(coupon.discount_type) ||
    (coupon.discount_type === 'percentage' && value > 100)
  ) {
    throw new AppError('This coupon is not configured correctly. Please contact support.', 503);
  }
  const discount = Math.min(subtotal, coupon.discount_type === 'percentage' ? subtotal * value / 100 : value);
  return res.json({ success: true, data: { code: coupon.code, discount_amount: discount, cart_subtotal: subtotal } });
});
export default router;
