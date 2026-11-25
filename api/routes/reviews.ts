import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.post('/', authenticate, [
  body('product_id').isUUID(),
  body('rating').isInt({ min: 1, max: 5 }),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { product_id, rating, title, body: reviewBody, order_id } = req.body;
  const product = await query('SELECT id FROM products WHERE id=$1 AND is_active=true', [product_id]);
  if (!product.rows[0]) throw new AppError('Product not found', 404);

  let verifiedPurchase = false;
  if (order_id) {
    const purchase = await query(
      `SELECT oi.id FROM order_items oi
       JOIN orders o ON o.id=oi.order_id
       WHERE o.id=$1 AND o.user_id=$2 AND oi.product_id=$3
         AND (o.payment_status='paid' OR o.status='delivered')
       LIMIT 1`,
      [order_id, req.user!.userId, product_id]);
    if (!purchase.rows[0]) {
      throw new AppError('A verified purchase for this product is required to attach an order to the review', 403);
    }
    verifiedPurchase = true;
  }

  const result = await query(
    `INSERT INTO reviews (product_id,user_id,order_id,rating,title,body,is_verified)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [product_id, req.user!.userId, verifiedPurchase ? order_id : null, rating,
      typeof title === 'string' ? title.trim() || null : null,
      typeof reviewBody === 'string' ? reviewBody.trim() || null : null,
      verifiedPurchase]);
  await query(
    `UPDATE products SET
       avg_rating=(SELECT AVG(rating) FROM reviews WHERE product_id=$1 AND is_approved=true),
       review_count=(SELECT COUNT(*) FROM reviews WHERE product_id=$1 AND is_approved=true)
     WHERE id=$1`, [product_id]);
  return res.status(201).json({ success: true, data: result.rows[0] });
});

router.get('/:productId', async (req: Request, res: Response) => {
  const { page = '1', limit = '10' } = req.query as Record<string, string>;
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 10));
  const offset = (safePage - 1) * safeLimit;
  const result = await query(
    `SELECT r.*, u.first_name||' '||LEFT(u.last_name,1)||'.' AS user_name, u.avatar_url
     FROM reviews r JOIN users u ON r.user_id=u.id
     WHERE r.product_id=$1 AND r.is_approved=true
     ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
    [req.params.productId, safeLimit, offset]);
  const stats = await query(
    'SELECT COUNT(*), AVG(rating) FROM reviews WHERE product_id=$1 AND is_approved=true',
    [req.params.productId]);
  return res.json({ success: true, data: result.rows,
    stats: { total: parseInt(stats.rows[0].count, 10), avg_rating: parseFloat(stats.rows[0].avg) || 0 } });
});

export default router;
