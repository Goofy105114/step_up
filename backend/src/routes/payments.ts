import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

// POST /api/payments/intent - create a payment intent
router.post('/intent', authenticate, async (req: Request, res: Response) => {
  const { order_id } = req.body;
  const orderRes = await query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [order_id, req.user!.userId]);
  const order = orderRes.rows[0];
  if (!order) throw new AppError('Order not found', 404);
  if (order.payment_status === 'paid') throw new AppError('Order already paid', 400);

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(parseFloat(order.total_amount) * 100), // paise
    currency: 'inr',
    metadata: { order_id: order.id, user_id: req.user!.userId },
  });

  await query('UPDATE orders SET payment_intent_id = $1 WHERE id = $2', [intent.id, order.id]);
  return res.json({ success: true, clientSecret: intent.client_secret });
});

// POST /api/payments/webhook - Stripe webhook
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err) {
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    await query(
      `UPDATE orders SET payment_status = 'paid', status = 'confirmed' WHERE payment_intent_id = $1`,
      [pi.id]
    );
    const orderRes = await query('SELECT id FROM orders WHERE payment_intent_id = $1', [pi.id]);
    if (orderRes.rows[0]) {
      await query(
        'INSERT INTO order_status_history (order_id, status, note) VALUES ($1,$2,$3)',
        [orderRes.rows[0].id, 'confirmed', 'Payment received']
      );
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent;
    await query(
      `UPDATE orders SET payment_status = 'failed' WHERE payment_intent_id = $1`,
      [pi.id]
    );
  }

  return res.json({ received: true });
});

// POST /api/payments/validate-coupon
router.post('/validate-coupon', authenticate, async (req: Request, res: Response) => {
  const { code, subtotal } = req.body;
  const result = await query(
    `SELECT * FROM coupons WHERE code = $1 AND is_active = true
     AND (valid_until IS NULL OR valid_until > NOW())
     AND (max_uses IS NULL OR used_count < max_uses)`,
    [code]
  );
  const coupon = result.rows[0];
  if (!coupon) throw new AppError('Invalid or expired coupon', 400);
  if (parseFloat(subtotal) < parseFloat(coupon.min_order_amount)) {
    throw new AppError(`Minimum order amount is ₹${coupon.min_order_amount}`, 400);
  }
  const discount = coupon.discount_type === 'percentage'
    ? (parseFloat(subtotal) * parseFloat(coupon.discount_value)) / 100
    : parseFloat(coupon.discount_value);

  return res.json({ success: true, coupon, discount: Math.min(discount, parseFloat(subtotal)) });
});

export default router;
