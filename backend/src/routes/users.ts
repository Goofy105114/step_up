import { Router, Request, Response } from 'express';
import pool, { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/users/profile
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    'SELECT id, email, first_name, last_name, phone, avatar_url, created_at FROM users WHERE id = $1',
    [req.user!.userId]
  );
  return res.json({ success: true, data: result.rows[0] });
});

// PATCH /api/users/profile
router.patch('/profile', authenticate, async (req: Request, res: Response) => {
  const { first_name, last_name, phone } = req.body;
  const result = await query(
    `UPDATE users SET first_name = COALESCE($1, first_name),
                      last_name  = COALESCE($2, last_name),
                      phone      = COALESCE($3, phone)
     WHERE id = $4 RETURNING id, email, first_name, last_name, phone`,
    [first_name, last_name, phone, req.user!.userId]
  );
  return res.json({ success: true, data: result.rows[0] });
});

// GET /api/users/addresses
router.get('/addresses', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
    [req.user!.userId]
  );
  return res.json({ success: true, data: result.rows });
});

// POST /api/users/addresses
router.post('/addresses', authenticate, async (req: Request, res: Response) => {
  const { label, full_name, phone, line1, line2, city, state, postal_code, country, is_default } = req.body;
  if (is_default !== undefined && typeof is_default !== 'boolean') {
    throw new AppError('is_default must be a boolean', 400);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize address mutations for this account so concurrent requests cannot
    // leave multiple default addresses or remove the only default accidentally.
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [req.user!.userId]);
    const existing = await client.query('SELECT id FROM addresses WHERE user_id=$1', [req.user!.userId]);
    const makeDefault = is_default === true || existing.rows.length === 0;
    if (makeDefault) {
      await client.query('UPDATE addresses SET is_default=false WHERE user_id=$1', [req.user!.userId]);
    }
    const result = await client.query(
      `INSERT INTO addresses (user_id,label,full_name,phone,line1,line2,city,state,postal_code,country,is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.user!.userId, label || 'Home', full_name, phone, line1, line2 || null, city, state, postal_code, country || 'India', makeDefault]
    );
    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// DELETE /api/users/addresses/:id
router.delete('/addresses/:id', authenticate, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [req.user!.userId]);
    const deleted = await client.query(
      'DELETE FROM addresses WHERE id=$1 AND user_id=$2 RETURNING is_default',
      [req.params.id, req.user!.userId]
    );
    if (!deleted.rows[0]) {
      await client.query('COMMIT');
      return res.json({ success: true, message: 'Address deleted' });
    }
    if (deleted.rows[0].is_default) {
      const next = await client.query(
        'SELECT id FROM addresses WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1',
        [req.user!.userId]
      );
      if (next.rows[0]) {
        await client.query('UPDATE addresses SET is_default=true WHERE id=$1', [next.rows[0].id]);
      }
    }
    await client.query('COMMIT');
    return res.json({ success: true, message: 'Address deleted' });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

export default router;
