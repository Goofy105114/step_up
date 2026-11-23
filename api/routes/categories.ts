import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
const router = Router();
router.get('/', async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT c.*, COUNT(p.id) AS product_count FROM categories c
     LEFT JOIN products p ON p.category_id=c.id AND p.is_active=true
     WHERE c.is_active=true GROUP BY c.id ORDER BY c.sort_order ASC`);
  return res.json({ success: true, data: result.rows });
});
export default router;
