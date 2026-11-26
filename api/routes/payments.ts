import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
const router = Router();

// Validate coupon
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

// Stripe payment intent (requires STRIPE_SECRET_KEY in env)
router.post('/intent', authenticate, async (req: Request, res: Response) => {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
    throw new AppError('Stripe not configured', 503);
  }
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any });
  const { order_id } = req.body;
  const orderRes = await query('SELECT * FROM orders WHERE id=$1 AND user_id=$2', [order_id, req.user!.userId]);
  const order = orderRes.rows[0];
  if (!order) throw new AppError('Order not found', 404);
  if (order.payment_status === 'paid') throw new AppError('Already paid', 400);
  if (order.payment_method !== 'card') throw new AppError('This order is not configured for card payment', 400);
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(parseFloat(order.total_amount) * 100),
    currency: 'inr',
    metadata: { order_id: order.id },
  });
  await query('UPDATE orders SET payment_intent_id=$1 WHERE id=$2', [intent.id, order.id]);
  return res.json({ success: true, clientSecret: intent.client_secret });
});

export default router;
