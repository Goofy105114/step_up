import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
const router = Router();

// Validate coupon
router.post('/validate-coupon', authenticate, async (req: Request, res: Response) => {
  const { code, subtotal } = req.body;
  const result = await query(
    `SELECT * FROM coupons WHERE code=$1 AND is_active=true
     AND (valid_until IS NULL OR valid_until>NOW())
     AND (max_uses IS NULL OR used_count<max_uses)`, [code]);
  const coupon = result.rows[0];
  if (!coupon) throw new AppError('Invalid or expired coupon', 400);
  if (parseFloat(subtotal) < parseFloat(coupon.min_order_amount))
    throw new AppError(`Minimum order amount is ₹${coupon.min_order_amount}`, 400);
  const discount = coupon.discount_type === 'percentage'
    ? (parseFloat(subtotal) * parseFloat(coupon.discount_value)) / 100
    : parseFloat(coupon.discount_value);
  return res.json({ success: true, coupon, discount: Math.min(discount, parseFloat(subtotal)) });
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
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(parseFloat(order.total_amount) * 100),
    currency: 'inr',
    metadata: { order_id: order.id },
  });
  await query('UPDATE orders SET payment_intent_id=$1 WHERE id=$2', [intent.id, order.id]);
  return res.json({ success: true, clientSecret: intent.client_secret });
});

export default router;
