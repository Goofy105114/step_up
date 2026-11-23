import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT w.id, w.created_at, p.id AS product_id, p.name, p.slug,
            COALESCE(p.sale_price, p.base_price) AS price, p.avg_rating,
            (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) AS image_url
     FROM wishlist_items w JOIN products p ON w.product_id = p.id
     WHERE w.user_id = $1 ORDER BY w.created_at DESC`,
    [req.user!.userId]
  );
  return res.json({ success: true, data: result.rows });
});

router.post('/', authenticate, async (req: Request, res: Response) => {
  const { product_id } = req.body;
  await query(
    'INSERT INTO wishlist_items (user_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [req.user!.userId, product_id]
  );
  return res.json({ success: true, message: 'Added to wishlist' });
});

router.delete('/:productId', authenticate, async (req: Request, res: Response) => {
  await query(
    'DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2',
    [req.user!.userId, req.params.productId]
  );
  return res.json({ success: true, message: 'Removed from wishlist' });
});

export default router;
