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
  const requestedQuantity = Number(quantity);
  if (!product_id || !variant_id) throw new AppError('product_id and variant_id required', 400);
  if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
    throw new AppError('Quantity must be a positive whole number', 400);
  }

  const variant = await query(
    `SELECT pv.stock_qty,pv.product_id FROM product_variants pv
     JOIN products p ON p.id=pv.product_id
     WHERE pv.id=$1 AND pv.product_id=$2 AND p.is_active=true`,
    [variant_id, product_id]);
  if (!variant.rows[0]) throw new AppError('Product variant not found or unavailable', 404);

  const cartId = await getOrCreateCart(req.user!.userId);
  const existing = await query(
    'SELECT quantity FROM cart_items WHERE cart_id=$1 AND variant_id=$2',
    [cartId, variant_id]);
  const totalQuantity = Number(existing.rows[0]?.quantity || 0) + requestedQuantity;
  if (totalQuantity > Number(variant.rows[0].stock_qty)) {
    throw new AppError('Requested quantity exceeds available stock', 400);
  }

  await query(
    `INSERT INTO cart_items (cart_id,product_id,variant_id,quantity) VALUES ($1,$2,$3,$4)
     ON CONFLICT (cart_id,variant_id) DO UPDATE SET quantity=cart_items.quantity+EXCLUDED.quantity`,
    [cartId, product_id, variant_id, requestedQuantity]);
  const items = await getCartData(cartId);
  return res.json({ success: true, data: items.rows });
});

router.patch('/items/:id', authenticate, async (req: Request, res: Response) => {
  const quantity = Number(req.body.quantity);
  const cartId = await getOrCreateCart(req.user!.userId);
  const existing = await query(
    `SELECT ci.id,pv.stock_qty FROM cart_items ci
     JOIN product_variants pv ON pv.id=ci.variant_id
     WHERE ci.id=$1 AND ci.cart_id=$2`,
    [req.params.id, cartId]);
  if (!existing.rows[0]) throw new AppError('Cart item not found', 404);

  if (!Number.isInteger(quantity)) throw new AppError('Quantity must be a whole number', 400);
  if (quantity < 1) {
    await query('DELETE FROM cart_items WHERE id=$1 AND cart_id=$2', [req.params.id, cartId]);
  } else {
    if (quantity > Number(existing.rows[0].stock_qty)) {
      throw new AppError('Requested quantity exceeds available stock', 400);
    }
    await query('UPDATE cart_items SET quantity=$1 WHERE id=$2 AND cart_id=$3',
      [quantity, req.params.id, cartId]);
  }
  const items = await getCartData(cartId);
  return res.json({ success: true, data: items.rows });
});

router.delete('/items/:id', authenticate, async (req: Request, res: Response) => {
  const cartId = await getOrCreateCart(req.user!.userId);
  const result = await query('DELETE FROM cart_items WHERE id=$1 AND cart_id=$2 RETURNING id',
    [req.params.id, cartId]);
  if (!result.rows[0]) throw new AppError('Cart item not found', 404);
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
     AND valid_from <= NOW() AND (valid_until IS NULL OR valid_until > NOW())
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
