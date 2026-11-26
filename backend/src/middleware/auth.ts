import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';
import { query } from '../db/pool';

/**
 * Validate the signed token and hydrate authorization claims from the current
 * database record. Role changes and deleted accounts therefore take effect
 * immediately instead of waiting for a seven-day JWT to expire.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.slice(7).trim();
  if (!token || token.includes(' ')) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ success: false, message: 'Server misconfiguration' });
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JwtPayload;
    if (
      !decoded ||
      typeof decoded.userId !== 'string' ||
      !decoded.userId ||
      typeof decoded.email !== 'string' ||
      typeof decoded.role !== 'string'
    ) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  return query('SELECT id, email, role FROM users WHERE id = $1', [decoded.userId])
    .then(result => {
      const user = result.rows[0];
      if (!user) {
        return res.status(401).json({ success: false, message: 'Account is no longer available. Please sign in again.' });
      }

      req.user = { userId: user.id, email: user.email, role: user.role };
      return next();
    })
    .catch(next);
};

export const authorize = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    return next();
  };
