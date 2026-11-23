import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// POST /api/reviews
router.post('/', authenticate, [
  body('product_id').notEmpty(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('title').optional().trim(),
  body('body').optional().trim(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { product_id, rating, title, body: reviewBody, order_id } = req.body;

  const result = await query(
    `INSERT INTO reviews (product_id, user_id, order_id, rating, title, body, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [product_id, req.user!.userId, order_id || null, rating, title || null, reviewBody || null, !!order_id]
  );

  // Update product avg_rating
  await query(
    `UPDATE products SET
       avg_rating = (SELECT AVG(rating) FROM reviews WHERE product_id = $1 AND is_approved = true),
       review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = $1 AND is_approved = true)
     WHERE id = $1`,
    [product_id]
  );

  return res.status(201).json({ success: true, data: result.rows[0] });
});

// GET /api/reviews/:productId
router.get('/:productId', async (req: Request, res: Response) => {
  const { page = '1', limit = '10' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const result = await query(
    `SELECT r.*, u.first_name || ' ' || LEFT(u.last_name,1) || '.' AS user_name, u.avatar_url
     FROM reviews r JOIN users u ON r.user_id = u.id
     WHERE r.product_id = $1 AND r.is_approved = true
     ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
    [req.params.productId, parseInt(limit), offset]
  );

  const countRes = await query(
    'SELECT COUNT(*), AVG(rating) FROM reviews WHERE product_id = $1 AND is_approved = true',
    [req.params.productId]
  );

  return res.json({
    success: true,
    data: result.rows,
    stats: {
      total: parseInt(countRes.rows[0].count),
      avg_rating: parseFloat(countRes.rows[0].avg) || 0,
    },
  });
});

export default router;
