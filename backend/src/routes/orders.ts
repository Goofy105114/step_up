import { Router, Request, Response } from 'express';
import pool, { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { randomBytes } from 'crypto';
import { recordPolicyConsent } from '../services/legal-policy-consent';
import { enqueueTransactionalEmail } from '../services/emailOutbox';

const router = Router();
const genOrderNo = () => 'ORD-' + Date.now() + '-' + randomBytes(8).toString('hex');

router.post('/', authenticate, async (req: Request, res: Response) => {
  const { shipping_address, billing_address, payment_method = 'cod', coupon_code, policy_acceptances } = req.body;
  if (!shipping_address || typeof shipping_address !== 'object' || Array.isArray(shipping_address)) {
    throw new AppError('Shipping address required', 400);
  }
  const requiredAddressFields = ['full_name', 'phone', 'line1', 'city', 'state', 'postal_code'];
  if (billing_address !== undefined && billing_address !== null) {
    if (typeof billing_address !== 'object' || Array.isArray(billing_address)) {
      throw new AppError('Billing address must be a valid address object', 400);
    }
    if (requiredAddressFields.some(field =>
      typeof billing_address[field] !== 'string' || !billing_address[field].trim()
    )) {
      throw new AppError('Complete all required billing address fields', 400);
    }
    if (
      billing_address.full_name.trim().length > 200 ||
      billing_address.phone.trim().length > 20 ||
      billing_address.line1.trim().length > 255 ||
      (billing_address.line2 !== undefined && billing_address.line2 !== null &&
        (typeof billing_address.line2 !== 'string' || billing_address.line2.trim().length > 255)) ||
      billing_address.city.trim().length > 100 ||
      billing_address.state.trim().length > 100 ||
      (billing_address.country !== undefined &&
        (typeof billing_address.country !== 'string' || billing_address.country.trim().length > 100)) ||
      (billing_address.email !== undefined &&
        (typeof billing_address.email !== 'string' || billing_address.email.trim().length > 255))
    ) {
      throw new AppError('One or more billing address fields exceed the allowed length', 400);
    }
    const billingPhone = billing_address.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!/^[6-9]\d{9}$/.test(billingPhone)) {
      throw new AppError('Enter a valid Indian billing mobile number', 400);
    }
    if (!/^\d{6}$/.test(billing_address.postal_code.trim())) {
      throw new AppError('Enter a valid 6-digit Indian billing PIN code', 400);
    }
    if (String(billing_address.country || 'India').trim().toLowerCase() !== 'india') {
      throw new AppError('STEPUP currently accepts billing addresses within India only', 400);
    }
  }
  if (requiredAddressFields.some(field => typeof shipping_address[field] !== 'string' || !shipping_address[field].trim())) {
    throw new AppError('Complete all required shipping address fields', 400);
  }
  if (shipping_address.full_name.trim().length > 200 ||
      shipping_address.phone.trim().length > 20 ||
      shipping_address.line1.trim().length > 255 ||
      (shipping_address.line2 !== undefined && shipping_address.line2 !== null &&
        (typeof shipping_address.line2 !== 'string' || shipping_address.line2.trim().length > 255)) ||
      shipping_address.city.trim().length > 100 ||
      shipping_address.state.trim().length > 100 ||
      (shipping_address.country !== undefined &&
        (typeof shipping_address.country !== 'string' || shipping_address.country.trim().length > 100)) ||
      (shipping_address.email !== undefined &&
        (typeof shipping_address.email !== 'string' || shipping_address.email.trim().length > 255))) {
    throw new AppError('One or more shipping address fields exceed the allowed length', 400);
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
      if (!coupon || subtotal < Number(coupon.min_order_amount)) {
        throw new AppError('Coupon is invalid, expired, or does not meet the minimum order amount', 400);
      }
      const couponValue = Number(coupon.discount_value);
      const minimumOrderAmount = Number(coupon.min_order_amount);
      if (
        !Number.isFinite(couponValue) || couponValue <= 0 ||
        !Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0 ||
        !['percentage', 'fixed'].includes(coupon.discount_type) ||
        (coupon.discount_type === 'percentage' && couponValue > 100)
      ) {
        throw new AppError('This coupon is not configured correctly. Please contact support.', 503);
      }
      couponId = coupon.id;
      discountAmount = coupon.discount_type === 'percentage'
        ? (subtotal * couponValue) / 100
        : couponValue;
      discountAmount = Math.min(discountAmount, subtotal);
    }

    const pricingResult = await client.query(
      "SELECT setting_value FROM store_settings WHERE setting_key='checkout_pricing' FOR SHARE"
    );
    const pricing = pricingResult.rows[0]?.setting_value;
    const freeShippingThreshold = Number(pricing?.free_shipping_threshold_inr);
    const shippingFee = Number(pricing?.shipping_fee_inr);
    const gstRatePercent = Number(pricing?.gst_rate_percent);
    const taxEnabled = pricing?.tax_enabled === true;
    const taxConfigurationConfirmed = pricing?.tax_configuration_confirmed === true;
    if (
      !Number.isFinite(freeShippingThreshold) || freeShippingThreshold < 0 ||
      !Number.isFinite(shippingFee) || shippingFee < 0 ||
      !Number.isFinite(gstRatePercent) || gstRatePercent < 0 || gstRatePercent > 100
    ) {
      throw new AppError('Checkout pricing is not configured correctly. Please contact support.', 503);
    }

    if (taxEnabled) {
      if (!taxConfigurationConfirmed) {
        throw new AppError('Tax collection is not enabled until the company confirms accountant-reviewed tax treatment.', 503);
      }
      const identityResult = await client.query(
        "SELECT setting_value->'business_identity' AS identity FROM store_settings WHERE setting_key='legal_policies'"
      );
      const identity = identityResult.rows[0]?.identity;
      const gstin = typeof identity?.gstin === 'string' ? identity.gstin.trim().toUpperCase() : '';
      const gstinHasValidFormat = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin);
      if (identity?.confirmed !== true || identity.gst_status !== 'verified' || !gstinHasValidFormat) {
        throw new AppError('Tax collection is blocked until the company confirms its seller identity and GST registration details.', 503);
      }
    }

    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const shippingAmount = taxableAmount >= freeShippingThreshold ? 0 : shippingFee;
    // Existing settings may contain a legacy 5% value. Never collect it as tax unless
    // the company explicitly enables tax and confirms accountant-reviewed treatment.
    const taxAmount = taxEnabled ? taxableAmount * (gstRatePercent / 100) : 0;
    const totalAmount = taxableAmount + shippingAmount + taxAmount;

    const orderRes = await client.query(
      `INSERT INTO orders (order_number,user_id,subtotal,discount_amount,shipping_amount,tax_amount,total_amount,
         shipping_address,billing_address,payment_method,coupon_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [genOrderNo(), req.user!.userId, subtotal, discountAmount, shippingAmount, taxAmount, totalAmount,
       JSON.stringify(shipping_address), JSON.stringify(billing_address || shipping_address),
       payment_method, couponId]);
    const order = orderRes.rows[0];
    // Preserve the seller identity that was confirmed when this order was placed.
    // This is optional until the additive migration is applied; it never blocks checkout.
    const snapshotTable = await client.query(
      "SELECT to_regclass('public.order_seller_snapshots') IS NOT NULL AS available"
    );
    if (snapshotTable.rows[0]?.available) {
      const identityResult = await client.query(
        "SELECT setting_value->'business_identity' AS identity FROM store_settings WHERE setting_key='legal_policies'"
      );
      const identity = identityResult.rows[0]?.identity;
      const identityFields = [
        'legal_name', 'registered_address', 'customer_care_email', 'customer_care_phone',
        'grievance_officer_name', 'grievance_officer_designation', 'grievance_email', 'grievance_phone',
      ];
      const validEmail = (value: unknown) =>
        typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (identity?.confirmed === true &&
          identityFields.every(field => typeof identity[field] === 'string' && identity[field].trim()) &&
          validEmail(identity.customer_care_email) && validEmail(identity.grievance_email)) {
        const gstin = typeof identity.gstin === 'string' ? identity.gstin.trim().toUpperCase() : '';
        const gstinHasValidFormat = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin);
        const gstStatus = identity.gst_status === 'not_registered'
          ? 'not_registered'
          : identity.gst_status === 'verified' && gstinHasValidFormat
            ? 'company_confirmed_registered'
            : 'unverified';
        const sellerSnapshot = {
          legal_name: identity.legal_name.trim(),
          registered_address: identity.registered_address.trim(),
          customer_care_email: identity.customer_care_email.trim(),
          customer_care_phone: identity.customer_care_phone.trim(),
          grievance_officer_name: identity.grievance_officer_name.trim(),
          grievance_officer_designation: identity.grievance_officer_designation.trim(),
          grievance_email: identity.grievance_email.trim(),
          grievance_phone: identity.grievance_phone.trim(),
          gst_status: gstStatus,
          gstin: gstStatus === 'company_confirmed_registered' ? gstin : null,
        };
        await client.query(
          'INSERT INTO order_seller_snapshots (order_id, seller_identity) VALUES ($1,$2) ON CONFLICT (order_id) DO NOTHING',
          [order.id, JSON.stringify(sellerSnapshot)]
        );
      }
    }

    await recordPolicyConsent(client, order.id, req.user!.userId, policy_acceptances);

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

    // Queue the order receipt in the same transaction as the order. A missing
    // account email must not block checkout; duplicate event keys are ignored.
    const customerEmailResult = await client.query('SELECT email FROM users WHERE id=$1', [req.user!.userId]);
    const customerEmail = customerEmailResult.rows[0]?.email;
    if (typeof customerEmail === 'string' && customerEmail.trim()) {
      await enqueueTransactionalEmail(
        client,
        `order:${order.id}:created`,
        'order_confirmation',
        customerEmail,
        { orderNumber: order.order_number },
      );
    }
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
      (SELECT json_build_object('id',rr.id,'reason',rr.reason,'status',rr.status,'request_type',rr.request_type,'admin_note',rr.admin_note,'reviewed_at',rr.reviewed_at,'created_at',rr.created_at)
       FROM return_requests rr WHERE rr.order_id=o.id) AS return_request,
      (SELECT json_build_object(
        'refunded_paise', COALESCE(SUM(pr.amount_paise),0)::bigint,
        'refunds', COALESCE(json_agg(json_build_object(
          'amount_paise',pr.amount_paise,'currency',pr.currency,'confirmed_at',pr.confirmed_at
        ) ORDER BY pr.confirmed_at) FILTER (WHERE pr.id IS NOT NULL),'[]'::json)
      ) FROM payment_refund_reconciliations pr WHERE pr.order_id=o.id) AS refund_summary,
      (SELECT json_agg(json_build_object(
        'policy_slug', opa.policy_slug,
        'policy_title', opa.policy_title,
        'content_sha256', opa.content_sha256,
        'accepted_at', opa.accepted_at
      ) ORDER BY opa.policy_slug)
       FROM order_policy_acceptances opa WHERE opa.order_id=o.id) AS policy_acceptances
     FROM orders o WHERE o.id=$1 AND o.user_id=$2`, [req.params.id, req.user!.userId]);
  if (!result.rows[0]) throw new AppError('Order not found', 404);
  const snapshotTable = await query(
    "SELECT to_regclass('public.order_seller_snapshots') IS NOT NULL AS available"
  );
  let sellerSnapshot = null;
  if (snapshotTable.rows[0]?.available) {
    const snapshot = await query(
      'SELECT seller_identity, captured_at FROM order_seller_snapshots WHERE order_id=$1',
      [req.params.id]
    );
    if (snapshot.rows[0]) {
      sellerSnapshot = { ...snapshot.rows[0].seller_identity, captured_at: snapshot.rows[0].captured_at };
    }
  }
  return res.json({ success: true, data: { ...result.rows[0], seller_snapshot: sellerSnapshot } });
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
      const restored = await client.query(
        'UPDATE product_variants SET stock_qty=stock_qty+$1 WHERE id=$2 RETURNING id',
        [item.quantity, item.variant_id]
      );
      if (restored.rowCount !== 1) {
        throw new AppError('Cannot complete cancellation because an ordered product variant is missing. Contact support to reconcile inventory.', 409);
      }
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
  const allowedReturnTypes = ['standard', 'defective', 'damaged', 'incorrect', 'misdescribed'];
  const requestType = req.body?.request_type;
  if (typeof requestType !== 'string' || !allowedReturnTypes.includes(requestType)) {
    throw new AppError('Choose a valid return reason category', 400);
  }
  if (typeof req.body?.reason !== 'string') {
    throw new AppError('Please provide return details between 5 and 1000 characters', 400);
  }
  const reason = req.body.reason.trim();
  if (reason.length < 5 || reason.length > 1000) {
    throw new AppError('Please provide return details between 5 and 1000 characters', 400);
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
    if (requestType === 'standard') {
      const policy = await client.query(
        "SELECT setting_value->'operational_confirmation' AS operations FROM store_settings WHERE setting_key='legal_policies'"
      );
      const operations = policy.rows[0]?.operations;
      const windowDays = Number.isInteger(operations?.return_window_days) ? operations.return_window_days : null;
      if (windowDays === null || !order.delivered_at) {
        throw new AppError('Standard returns are not currently available because the company has not confirmed its return window. If the item is defective, damaged, incorrect or misdescribed, select the relevant issue category or contact support.', 409);
      }
      const withinWindow = await client.query(
        "SELECT NOW() <= ($1::timestamptz + ($2::int * INTERVAL '1 day')) AS eligible",
        [order.delivered_at, windowDays]
      );
      if (!withinWindow.rows[0]?.eligible) {
        throw new AppError('The configured standard return window has passed. If the item is defective, damaged, incorrect or misdescribed, submit that issue category or contact support so it can be reviewed separately.', 409);
      }
    }
    const existing = await client.query('SELECT id FROM return_requests WHERE order_id=$1', [order.id]);
    if (existing.rows[0]) throw new AppError('A return request already exists for this order', 409);
    const inserted = await client.query(
      `INSERT INTO return_requests (order_id,user_id,reason,status,request_type)
       VALUES ($1,$2,$3,'requested',$4) RETURNING id,reason,status,request_type,created_at`,
      [order.id, req.user!.userId, reason, requestType]);
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
