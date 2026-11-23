import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
const router = Router();

router.get('/profile', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    'SELECT id,email,first_name,last_name,phone,avatar_url,created_at FROM users WHERE id=$1',
    [req.user!.userId]);
  return res.json({ success: true, data: result.rows[0] });
});

router.patch('/profile', authenticate, async (req: Request, res: Response) => {
  const { first_name, last_name, phone } = req.body;
  const result = await query(
    `UPDATE users SET first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name), phone=COALESCE($3,phone)
     WHERE id=$4 RETURNING id,email,first_name,last_name,phone`,
    [first_name, last_name, phone, req.user!.userId]);
  return res.json({ success: true, data: result.rows[0] });
});

router.get('/addresses', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    'SELECT * FROM addresses WHERE user_id=$1 ORDER BY is_default DESC,created_at DESC',
    [req.user!.userId]);
  return res.json({ success: true, data: result.rows });
});

router.post('/addresses', authenticate, async (req: Request, res: Response) => {
  const { label, full_name, phone, line1, line2, city, state, postal_code, country, is_default } = req.body;
  if (is_default) await query('UPDATE addresses SET is_default=false WHERE user_id=$1', [req.user!.userId]);
  const result = await query(
    `INSERT INTO addresses (user_id,label,full_name,phone,line1,line2,city,state,postal_code,country,is_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [req.user!.userId, label||'Home', full_name, phone, line1, line2||null, city, state, postal_code, country||'India', is_default||false]);
  return res.status(201).json({ success: true, data: result.rows[0] });
});

router.delete('/addresses/:id', authenticate, async (req: Request, res: Response) => {
  await query('DELETE FROM addresses WHERE id=$1 AND user_id=$2', [req.params.id, req.user!.userId]);
  return res.json({ success: true, message: 'Address deleted' });
});

export default router;
