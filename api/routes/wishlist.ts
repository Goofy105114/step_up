import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT w.id,w.created_at,p.id AS product_id,p.name,p.slug,
      COALESCE(p.sale_price,p.base_price) AS price,p.avg_rating,
      (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS image_url
     FROM wishlist_items w JOIN products p ON w.product_id=p.id
     WHERE w.user_id=$1 AND p.is_active=true ORDER BY w.created_at DESC`, [req.user!.userId]);
  return res.json({ success: true, data: result.rows });
});

router.post('/', authenticate, async (req: Request, res: Response) => {
  const productId = typeof req.body?.product_id === 'string' ? req.body.product_id.trim() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
    throw new AppError('A valid product is required', 400);
  }

  const inserted = await query(
    `INSERT INTO wishlist_items (user_id, product_id)
     SELECT $1, p.id FROM products p WHERE p.id = $2 AND p.is_active = true
     ON CONFLICT (user_id, product_id) DO NOTHING
     RETURNING id`,
    [req.user!.userId, productId]
  );

  if (inserted.rowCount === 0) {
    const product = await query('SELECT id FROM products WHERE id = $1 AND is_active = true', [productId]);
    if (!product.rows[0]) throw new AppError('Product not found or unavailable', 404);
  }

  return res.json({ success: true, message: inserted.rowCount ? 'Added to wishlist' : 'Already in wishlist' });
});

router.delete('/:productId', authenticate, async (req: Request, res: Response) => {
  const productId = req.params.productId;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
    throw new AppError('A valid product is required', 400);
  }
  await query(
    'DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2',
    [req.user!.userId, productId]
  );
  return res.json({ success: true, message: 'Removed from wishlist' });
});

export default router;
