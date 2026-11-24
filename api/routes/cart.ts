import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const getOrCreateCart = async (userId: string) => {
  let cart = await query('SELECT id FROM carts WHERE user_id=$1', [userId]);
  if (!cart.rows[0]) cart = await query('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [userId]);
  return cart.rows[0].id;
};

const getCartData = (cartId: string) => query(
  `SELECT ci.id, ci.quantity, ci.variant_id, ci.product_id,
    p.name, p.slug, COALESCE(p.sale_price,p.base_price)+pv.price_adj AS unit_price,
    pv.size, pv.color, pv.color_hex, pv.stock_qty,
    (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS image_url
   FROM cart_items ci
   JOIN products p ON ci.product_id=p.id
   JOIN product_variants pv ON ci.variant_id=pv.id
   WHERE ci.cart_id=$1`, [cartId]);

router.get('/', authenticate, async (req: Request, res: Response) => {
  const cartId = await getOrCreateCart(req.user!.userId);
  const items = await getCartData(cartId);
  const subtotal = items.rows.reduce((s: number, i: any) => s + parseFloat(i.unit_price) * i.quantity, 0);
  return res.json({ success: true, data: { cartId, items: items.rows, subtotal } });
});

router.post('/items', authenticate, async (req: Request, res: Response) => {
  const { product_id, variant_id, quantity = 1 } = req.body;
  if (!product_id || !variant_id) throw new AppError('product_id and variant_id required', 400);
  const v = await query('SELECT stock_qty FROM product_variants WHERE id=$1', [variant_id]);
  if (!v.rows[0]) throw new AppError('Variant not found', 404);
  if (v.rows[0].stock_qty < quantity) throw new AppError('Insufficient stock', 400);
  const cartId = await getOrCreateCart(req.user!.userId);
  await query(
    `INSERT INTO cart_items (cart_id,product_id,variant_id,quantity) VALUES ($1,$2,$3,$4)
     ON CONFLICT (cart_id,variant_id) DO UPDATE SET quantity=cart_items.quantity+$4`,
    [cartId, product_id, variant_id, quantity]);
  const items = await getCartData(cartId);
  return res.json({ success: true, data: items.rows });
});

router.patch('/items/:id', authenticate, async (req: Request, res: Response) => {
  const { quantity } = req.body;
  if (quantity < 1) await query('DELETE FROM cart_items WHERE id=$1', [req.params.id]);
  else await query('UPDATE cart_items SET quantity=$1 WHERE id=$2', [quantity, req.params.id]);
  const cartId = await getOrCreateCart(req.user!.userId);
  const items = await getCartData(cartId);
  return res.json({ success: true, data: items.rows });
});

router.delete('/items/:id', authenticate, async (req: Request, res: Response) => {
  await query('DELETE FROM cart_items WHERE id=$1', [req.params.id]);
  const cartId = await getOrCreateCart(req.user!.userId);
  const items = await getCartData(cartId);
  return res.json({ success: true, data: items.rows });
});

router.delete('/', authenticate, async (req: Request, res: Response) => {
  const cartId = await getOrCreateCart(req.user!.userId);
  await query('DELETE FROM cart_items WHERE cart_id=$1', [cartId]);
  return res.json({ success: true, message: 'Cart cleared' });
});

router.post('/apply-coupon', authenticate, async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) throw new AppError('Coupon code required', 400);
  const result = await query(
    `SELECT * FROM coupons WHERE UPPER(code)=UPPER($1) AND is_active=true
     AND (valid_until IS NULL OR valid_until > NOW())
     AND (max_uses IS NULL OR used_count < max_uses)`, [code]);
  const coupon = result.rows[0];
  if (!coupon) throw new AppError('Invalid or expired coupon code', 404);
  return res.json({ success: true, data: {
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    min_order_amount: coupon.min_order_amount,
    description: coupon.description,
  }});
});

export default router;
