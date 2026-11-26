import { Router, Request, Response } from 'express';
import pool, { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const genOrderNo = () => 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

router.post('/', authenticate, async (req: Request, res: Response) => {
  const { shipping_address, billing_address, payment_method = 'cod', coupon_code } = req.body;
  if (!shipping_address || typeof shipping_address !== 'object') {
    throw new AppError('Shipping address required', 400);
  }
  const requiredAddressFields = ['full_name', 'phone', 'line1', 'city', 'state', 'postal_code'];
  if (requiredAddressFields.some(field => !String(shipping_address[field] || '').trim())) {
    throw new AppError('Complete all required shipping address fields', 400);
  }
  if (payment_method !== 'cod') throw new AppError('Online payments are not enabled. Choose Cash on Delivery.', 400);
  const phone = String(shipping_address.phone || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  if (!/^[6-9]\d{9}$/.test(phone)) throw new AppError('Enter a valid Indian mobile number', 400);
  if (!/^\d{6}$/.test(String(shipping_address.postal_code || '').trim())) throw new AppError('Enter a valid 6-digit Indian PIN code', 400);
  if (String(shipping_address.country || 'India').trim().toLowerCase() !== 'india') throw new AppError('STEPUP currently delivers within India only', 400);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cartRes = await client.query('SELECT id FROM carts WHERE user_id=$1 ORDER BY created_at ASC LIMIT 1 FOR UPDATE', [req.user!.userId]);
    if (!cartRes.rows[0]) throw new AppError('Cart is empty', 400);
    const cartId = cartRes.rows[0].id;

    const itemsRes = await client.query(
      `SELECT ci.*, COALESCE(p.sale_price,p.base_price)+pv.price_adj AS unit_price,
        p.name, pv.size, pv.color, pv.stock_qty,
        (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS image_url
       FROM cart_items ci
       JOIN products p ON ci.product_id=p.id AND p.is_active=true
       JOIN product_variants pv ON ci.variant_id=pv.id AND pv.product_id=p.id
       WHERE ci.cart_id=$1
       FOR UPDATE OF pv`, [cartId]);
    const cartCount = await client.query('SELECT COUNT(*) FROM cart_items WHERE cart_id=$1', [cartId]);
    if (!itemsRes.rows.length) throw new AppError('Cart is empty or contains unavailable products', 400);
    if (Number(cartCount.rows[0].count) !== itemsRes.rows.length) {
      throw new AppError('One or more cart items are no longer available. Remove them and try again.', 409);
    }

    for (const item of itemsRes.rows) {
      if (Number(item.stock_qty) < Number(item.quantity)) {
        throw new AppError(`Insufficient stock for ${item.name}`, 400);
      }
    }

    const subtotal = itemsRes.rows.reduce(
      (sum: number, item: any) => sum + Number(item.unit_price) * Number(item.quantity), 0);
    let discountAmount = 0;
    let couponId: string | null = null;

    if (coupon_code) {
      const couponResult = await client.query(
        `SELECT * FROM coupons WHERE code=$1 AND is_active=true
         AND valid_from<=NOW() AND (valid_until IS NULL OR valid_until>NOW())
         AND (max_uses IS NULL OR used_count<max_uses)
         AND (user_id IS NULL OR user_id=$2)
         FOR UPDATE`, [String(coupon_code).trim().toUpperCase(), req.user!.userId]);
      const coupon = couponResult.rows[0];
      if (coupon && subtotal >= Number(coupon.min_order_amount)) {
        couponId = coupon.id;
        discountAmount = coupon.discount_type === 'percentage'
          ? (subtotal * Number(coupon.discount_value)) / 100
          : Number(coupon.discount_value);
        discountAmount = Math.min(discountAmount, subtotal);
      } else if (coupon_code) {
        throw new AppError('Coupon is invalid, expired, or does not meet the minimum order amount', 400);
      }
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

    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const shippingAmount = taxableAmount >= freeShippingThreshold ? 0 : shippingFee;
    const taxAmount = taxableAmount * (gstRatePercent / 100);
    const totalAmount = taxableAmount + shippingAmount + taxAmount;

    const orderRes = await client.query(
      `INSERT INTO orders (order_number,user_id,subtotal,discount_amount,shipping_amount,tax_amount,total_amount,
         shipping_address,billing_address,payment_method,coupon_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [genOrderNo(), req.user!.userId, subtotal, discountAmount, shippingAmount, taxAmount, totalAmount,
       JSON.stringify(shipping_address), JSON.stringify(billing_address || shipping_address),
       payment_method, couponId]);
    const order = orderRes.rows[0];

    for (const item of itemsRes.rows) {
      const stockUpdate = await client.query(
        'UPDATE product_variants SET stock_qty=stock_qty-$1 WHERE id=$2 AND stock_qty >= $1 RETURNING id',
        [item.quantity, item.variant_id]);
      if (stockUpdate.rowCount !== 1) throw new AppError(`Insufficient stock for ${item.name}`, 409);

      await client.query(
        `INSERT INTO order_items (order_id,product_id,variant_id,product_name,size,color,quantity,unit_price,total_price,image_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [order.id, item.product_id, item.variant_id, item.name, item.size, item.color,
         item.quantity, item.unit_price, Number(item.unit_price) * Number(item.quantity), item.image_url]);
    }

    await client.query('INSERT INTO order_status_history (order_id,status,note) VALUES ($1,$2,$3)',
      [order.id, 'pending', 'Order placed']);
    await client.query('DELETE FROM cart_items WHERE cart_id=$1', [cartId]);
    if (couponId) await client.query('UPDATE coupons SET used_count=used_count+1 WHERE id=$1', [couponId]);

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

router.get('/', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT o.*,
      (SELECT json_agg(json_build_object('id',oi.id,'product_name',oi.product_name,'size',oi.size,'color',oi.color,'quantity',oi.quantity,'unit_price',oi.unit_price,'image_url',oi.image_url))
       FROM order_items oi WHERE oi.order_id=o.id) AS items
     FROM orders o WHERE o.user_id=$1 ORDER BY o.created_at DESC`, [req.user!.userId]);
  return res.json({ success: true, data: result.rows });
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT o.*,
      (SELECT json_agg(json_build_object('id',oi.id,'product_name',oi.product_name,'size',oi.size,'color',oi.color,'quantity',oi.quantity,'unit_price',oi.unit_price,'total_price',oi.total_price,'image_url',oi.image_url))
       FROM order_items oi WHERE oi.order_id=o.id) AS items,
      (SELECT json_agg(json_build_object('status',osh.status,'note',osh.note,'created_at',osh.created_at) ORDER BY osh.created_at)
       FROM order_status_history osh WHERE osh.order_id=o.id) AS history,
      (SELECT json_build_object('id',rr.id,'reason',rr.reason,'status',rr.status,'created_at',rr.created_at)
       FROM return_requests rr WHERE rr.order_id=o.id) AS return_request
     FROM orders o WHERE o.id=$1 AND o.user_id=$2`, [req.params.id, req.user!.userId]);
  if (!result.rows[0]) throw new AppError('Order not found', 404);
  return res.json({ success: true, data: result.rows[0] });
});

router.post('/:id/cancel', authenticate, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id=$1 AND user_id=$2 FOR UPDATE',
      [req.params.id, req.user!.userId]);
    const order = orderResult.rows[0];
    if (!order) throw new AppError('Order not found', 404);
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new AppError('Order cannot be cancelled', 400);
    }
    if (order.payment_status === 'paid') {
      throw new AppError('This order has a recorded payment. Contact support to arrange a refund before cancellation.', 409);
    }

    await client.query('UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2', ['cancelled', order.id]);
    if (order.coupon_id) {
      await client.query(
        'UPDATE coupons SET used_count=GREATEST(0,used_count-1) WHERE id=$1',
        [order.coupon_id]
      );
    }
    await client.query('INSERT INTO order_status_history (order_id,status,note) VALUES ($1,$2,$3)',
      [order.id, 'cancelled', 'Cancelled by customer']);
    const items = await client.query('SELECT * FROM order_items WHERE order_id=$1', [order.id]);
    for (const item of items.rows) {
      await client.query('UPDATE product_variants SET stock_qty=stock_qty+$1 WHERE id=$2',
        [item.quantity, item.variant_id]);
    }

    await client.query('COMMIT');
    return res.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});


router.post('/:id/return', authenticate, async (req: Request, res: Response) => {
  const reason = String(req.body?.reason || '').trim();
  if (reason.length < 5 || reason.length > 1000) {
    throw new AppError('Please provide a return reason between 5 and 1000 characters', 400);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id=$1 AND user_id=$2 FOR UPDATE',
      [req.params.id, req.user!.userId]);
    const order = orderResult.rows[0];
    if (!order) throw new AppError('Order not found', 404);
    if (order.status !== 'delivered') throw new AppError('A return can only be requested for a delivered order', 409);
    const existing = await client.query('SELECT id FROM return_requests WHERE order_id=$1', [order.id]);
    if (existing.rows[0]) throw new AppError('A return request already exists for this order', 409);
    const inserted = await client.query(
      `INSERT INTO return_requests (order_id,user_id,reason,status)
       VALUES ($1,$2,$3,'requested') RETURNING id,reason,status,created_at`,
      [order.id, req.user!.userId, reason]);
    await client.query(
      'INSERT INTO order_status_history (order_id,status,note,created_by) VALUES ($1,$2,$3,$4)',
      [order.id, order.status, 'Customer submitted a return request for review', req.user!.userId]);
    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: inserted.rows[0], message: 'Return request submitted for review. No refund has been issued.' });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

export default router;
