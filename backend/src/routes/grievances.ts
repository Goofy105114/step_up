import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { randomBytes } from 'crypto';
import pool, { query } from '../db/pool';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const grievanceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many support requests. Please try again later.' },
});

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

router.post('/', grievanceLimiter, async (req: Request, res: Response) => {
  const { customer_name, customer_email, customer_phone, order_number, subject, message } = req.body || {};
  if (typeof customer_name !== 'string' || customer_name.trim().length < 2 || customer_name.trim().length > 200) {
    throw new AppError('Enter your name (2–200 characters)', 400);
  }
  if (typeof customer_email !== 'string' || customer_email.trim().length > 255 || !validEmail(customer_email.trim())) {
    throw new AppError('Enter a valid email address', 400);
  }
  if (customer_phone !== undefined && customer_phone !== null &&
      (typeof customer_phone !== 'string' || customer_phone.trim().length > 20)) {
    throw new AppError('Phone number must be 20 characters or fewer', 400);
  }
  if (order_number !== undefined && order_number !== null &&
      (typeof order_number !== 'string' || order_number.trim().length > 50)) {
    throw new AppError('Order number must be 50 characters or fewer', 400);
  }
  const allowedSubjects = ['Order or delivery', 'Return or refund', 'Payment', 'Product information', 'Fit or comfort feature', 'Privacy or personal data', 'Other'];
  if (typeof subject !== 'string' || !allowedSubjects.includes(subject)) {
    throw new AppError('Choose a valid support topic', 400);
  }
  if (typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 5000) {
    throw new AppError('Describe your concern in 10–5000 characters', 400);
  }

  const ticketNumber = 'SUP-' + randomBytes(12).toString('hex').toUpperCase();
  const result = await query(
    `INSERT INTO customer_grievances
      (ticket_number, customer_name, customer_email, customer_phone, order_number, subject, message, status, acknowledged_at, resolution_due_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'open',NOW(),NOW() + INTERVAL '1 month')
     RETURNING ticket_number, status, acknowledged_at, resolution_due_at, created_at`,
    [ticketNumber, customer_name.trim(), customer_email.trim().toLowerCase(),
      customer_phone?.trim() || null, order_number?.trim() || null, subject, message.trim()]
  );
  return res.status(201).json({
    success: true,
    message: 'Your complaint has been received and assigned a reference number.',
    data: result.rows[0],
  });
});

router.post('/track', grievanceLimiter, async (req: Request, res: Response) => {
  const { ticket_number, customer_email } = req.body || {};
  if (typeof ticket_number !== 'string' || !/^SUP-[A-F0-9]{24}$/.test(ticket_number.trim().toUpperCase()) ||
      typeof customer_email !== 'string' || !validEmail(customer_email.trim())) {
    throw new AppError('Enter a valid complaint reference and the email address used when submitting it', 400);
  }
  const result = await query(
    `SELECT ticket_number, subject, status, acknowledged_at, resolution_due_at, resolved_at, created_at
     FROM customer_grievances
     WHERE ticket_number=$1 AND LOWER(customer_email)=LOWER($2)`,
    [ticket_number.trim().toUpperCase(), customer_email.trim()]
  );
  if (!result.rows[0]) throw new AppError('No complaint was found for that reference and email combination', 404);
  return res.json({ success: true, data: result.rows[0] });
});

export default router;
