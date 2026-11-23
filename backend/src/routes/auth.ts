import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const getSecret = (): string => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
};

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
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
     VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role`,
    [email, hash, first_name, last_name, phone || null]
  );
  const user = result.rows[0];
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, getSecret(), { expiresIn: '7d' });
  return res.status(201).json({ success: true, token, user });
});

// POST /api/auth/login
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

  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, getSecret(), { expiresIn: '7d' });
  const { password_hash: _, ...safeUser } = user;
  return res.json({ success: true, token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    'SELECT id, email, first_name, last_name, phone, role, avatar_url, created_at FROM users WHERE id = $1',
    [req.user!.userId]
  );
  if (!result.rows[0]) throw new AppError('User not found', 404);
  return res.json({ success: true, user: result.rows[0] });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, [
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8 }),
], async (req: Request, res: Response) => {
  const { current_password, new_password } = req.body;
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user!.userId]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(current_password, user.password_hash)))
    throw new AppError('Current password is incorrect', 400);
  const hash = await bcrypt.hash(new_password, 12);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user!.userId]);
  return res.json({ success: true, message: 'Password updated successfully' });
});

// POST /api/auth/forgot-password
// Generates a reset token and returns it (in production, email this link to the user)
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { email } = req.body;
  const result = await query('SELECT id, email, first_name FROM users WHERE email = $1', [email]);

  // Always return success to avoid email enumeration
  if (!result.rows[0]) {
    return res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });
  }

  const user = result.rows[0];
  // Short-lived reset token (15 min)
  const resetToken = jwt.sign({ userId: user.id, purpose: 'reset' }, getSecret(), { expiresIn: '15m' });

  // In production: send resetToken via email (Resend/Nodemailer)
  // For now: return it in dev mode so it can be used directly
  const isDev = process.env.NODE_ENV !== 'production';
  return res.json({
    success: true,
    message: 'If this email exists, a reset link has been sent.',
    ...(isDev && { dev_reset_token: resetToken, dev_note: 'Token returned in dev mode only' }),
  });
});

// POST /api/auth/reset-password
router.post('/reset-password', [
  body('token').notEmpty(),
  body('new_password').isLength({ min: 8 }),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { token, new_password } = req.body;

  let decoded: { userId: string; purpose: string };
  try {
    decoded = jwt.verify(token, getSecret()) as { userId: string; purpose: string };
  } catch {
    throw new AppError('Reset link is invalid or has expired', 400);
  }

  if (decoded.purpose !== 'reset') throw new AppError('Invalid token purpose', 400);

  const hash = await bcrypt.hash(new_password, 12);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, decoded.userId]);
  return res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
});

export default router;
