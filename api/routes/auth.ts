import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
};

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('first_name').trim().notEmpty(),
  body('last_name').trim().notEmpty(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const { email, password, first_name, last_name, phone } = req.body;
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) throw new AppError('Email already registered', 409);
  const hash = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, email, first_name, last_name, role`,
    [email, hash, first_name, last_name, phone || null]
  );
  const user = result.rows[0];
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
  return res.status(201).json({ success: true, token, user });
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const { email, password } = req.body;
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    throw new AppError('Invalid email or password', 401);
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
  const { password_hash: _pw, ...safeUser } = user;
  return res.json({ success: true, token, user: safeUser });
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    'SELECT id,email,first_name,last_name,phone,role,avatar_url,created_at FROM users WHERE id=$1',
    [req.user!.userId]
  );
  if (!result.rows[0]) throw new AppError('User not found', 404);
  return res.json({ success: true, user: result.rows[0] });
});

router.post('/change-password', authenticate, [
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8 }),
], async (req: Request, res: Response) => {
  const { current_password, new_password } = req.body;
  const result = await query('SELECT password_hash FROM users WHERE id=$1', [req.user!.userId]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(current_password, user.password_hash)))
    throw new AppError('Current password is incorrect', 400);
  const hash = await bcrypt.hash(new_password, 12);
  await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user!.userId]);
  return res.json({ success: true, message: 'Password updated' });
});

export default router;
