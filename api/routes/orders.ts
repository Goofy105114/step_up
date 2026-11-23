import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const genOrderNo = () => 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

router.post('/', authenticate, async (req: Request, res: Response) => {
  const { shipping_address, billing_address, payment_method = 'cod', coupon_code } = req.body;
  if (!shipping_address) throw new AppError('Shipping address required', 400);
  const userId = req.user!.userId;

  const cartRes = await query('SELECT id FROM carts WHERE user_id=$1', [userId]);
  if (!cartRes.rows[0]) throw new AppError('Cart is empty', 400);
  const cartId = cartRes.rows[0].id;

  const itemsRes = await query(
    `SELECT ci.*, COALESCE(p.sale_price,p.base_price)+pv.price_adj AS unit_price,
      p.name, pv.size, pv.color, pv.stock_qty,
      (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS image_url
     FROM cart_items ci
     JOIN products p ON ci.product_id=p.id
     JOIN product_variants pv ON ci.variant_id=pv.id
     WHERE ci.cart_id=$1`, [cartId]);
  if (!itemsRes.rows.length) throw new AppError('Cart is empty', 400);

  for (const item of itemsRes.rows) {
    if (item.stock_qty < item.quantity) throw new AppError(`Insufficient stock for ${item.name}`, 400);
  }

  let subtotal = itemsRes.rows.reduce((s: number, i: any) => s + parseFloat(i.unit_price) * i.quantity, 0);
  let discountAmount = 0;
  let couponId = null;

  if (coupon_code) {
    const cr = await query(
      `SELECT * FROM coupons WHERE code=$1 AND is_active=true
       AND (valid_until IS NULL OR valid_until>NOW())
       AND (max_uses IS NULL OR used_count<max_uses)`, [coupon_code]);
    const coupon = cr.rows[0];
    if (coupon && subtotal >= parseFloat(coupon.min_order_amount)) {
      couponId = coupon.id;
      discountAmount = coupon.discount_type === 'percentage'
        ? (subtotal * parseFloat(coupon.discount_value)) / 100
        : parseFloat(coupon.discount_value);
    }
  }

  const shippingAmount = subtotal - discountAmount >= 599 ? 0 : 99;
  const taxAmount = (subtotal - discountAmount) * 0.05;
  const totalAmount = subtotal - discountAmount + shippingAmount + taxAmount;

  const orderRes = await query(
    `INSERT INTO orders (order_number,user_id,subtotal,discount_amount,shipping_amount,tax_amount,total_amount,
       shipping_address,billing_address,payment_method,coupon_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [genOrderNo(), userId, subtotal, discountAmount, shippingAmount, taxAmount, totalAmount,
     JSON.stringify(shipping_address), JSON.stringify(billing_address || shipping_address),
     payment_method, couponId]);
  const order = orderRes.rows[0];

  for (const item of itemsRes.rows) {
    await query(
      `INSERT INTO order_items (order_id,product_id,variant_id,product_name,size,color,quantity,unit_price,total_price,image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [order.id, item.product_id, item.variant_id, item.name, item.size, item.color,
       item.quantity, item.unit_price, parseFloat(item.unit_price) * item.quantity, item.image_url]);
    await query('UPDATE product_variants SET stock_qty=stock_qty-$1 WHERE id=$2', [item.quantity, item.variant_id]);
  }

  await query('INSERT INTO order_status_history (order_id,status,note) VALUES ($1,$2,$3)',
    [order.id, 'pending', 'Order placed']);
  await query('DELETE FROM cart_items WHERE cart_id=$1', [cartId]);
  if (couponId) await query('UPDATE coupons SET used_count=used_count+1 WHERE id=$1', [couponId]);

  return res.status(201).json({ success: true, data: order });
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
       FROM order_status_history osh WHERE osh.order_id=o.id) AS history
     FROM orders o WHERE o.id=$1 AND o.user_id=$2`, [req.params.id, req.user!.userId]);
  if (!result.rows[0]) throw new AppError('Order not found', 404);
  return res.json({ success: true, data: result.rows[0] });
});

router.post('/:id/cancel', authenticate, async (req: Request, res: Response) => {
  const or = await query('SELECT * FROM orders WHERE id=$1 AND user_id=$2', [req.params.id, req.user!.userId]);
  const order = or.rows[0];
  if (!order) throw new AppError('Order not found', 404);
  if (!['pending', 'confirmed'].includes(order.status)) throw new AppError('Order cannot be cancelled', 400);
  await query('UPDATE orders SET status=$1 WHERE id=$2', ['cancelled', order.id]);
  await query('INSERT INTO order_status_history (order_id,status,note) VALUES ($1,$2,$3)',
    [order.id, 'cancelled', 'Cancelled by customer']);
  const items = await query('SELECT * FROM order_items WHERE order_id=$1', [order.id]);
  for (const item of items.rows) {
    await query('UPDATE product_variants SET stock_qty=stock_qty+$1 WHERE id=$2', [item.quantity, item.variant_id]);
  }
  return res.json({ success: true, message: 'Order cancelled' });
});

export default router;
