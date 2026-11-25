import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    'SELECT * FROM patient_fit_profiles WHERE user_id=$1',
    [req.user!.userId]);
  return res.json({ success: true, data: result.rows[0] || null });
});

router.put('/', authenticate, async (req: Request, res: Response) => {
  const { consent, foot_length_mm, usual_size, arch_preference, comfort_focus, daily_activity } = req.body;
  if (consent !== true) throw new AppError('Consent is required to save this fit profile', 400);
  if (foot_length_mm !== undefined && foot_length_mm !== null && foot_length_mm !== '') {
    if (!Number.isFinite(Number(foot_length_mm)) || Number(foot_length_mm) <= 0 || Number(foot_length_mm) > 500) {
      throw new AppError('Foot length must be a positive measurement in millimetres', 400);
    }
  }
  if (usual_size && String(usual_size).length > 20) throw new AppError('Usual size must be 20 characters or fewer', 400);
  if (arch_preference && !['low','medium','high','unknown'].includes(arch_preference)) throw new AppError('Invalid arch preference', 400);
  if (comfort_focus && !['heel','arch','forefoot','stability','general'].includes(comfort_focus)) throw new AppError('Invalid comfort focus', 400);
  if (daily_activity && !['low','moderate','high'].includes(daily_activity)) throw new AppError('Invalid daily activity level', 400);

  const result = await query(
    `INSERT INTO patient_fit_profiles
      (user_id,foot_length_mm,usual_size,arch_preference,comfort_focus,daily_activity,consent_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       foot_length_mm=EXCLUDED.foot_length_mm,
       usual_size=EXCLUDED.usual_size,
       arch_preference=EXCLUDED.arch_preference,
       comfort_focus=EXCLUDED.comfort_focus,
       daily_activity=EXCLUDED.daily_activity,
       consent_at=NOW(),
       updated_at=NOW()
     RETURNING *`,
    [req.user!.userId, foot_length_mm === '' ? null : foot_length_mm ?? null,
      usual_size || null, arch_preference || null, comfort_focus || null, daily_activity || null]);
  return res.json({ success: true, data: result.rows[0] });
});

router.delete('/', authenticate, async (req: Request, res: Response) => {
  await query('DELETE FROM patient_fit_profiles WHERE user_id=$1', [req.user!.userId]);
  return res.json({ success: true, message: 'Fit profile deleted' });
});

export default router;
