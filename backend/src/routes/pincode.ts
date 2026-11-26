import { Router, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/:pincode', async (req: Request, res: Response) => {
  const pincode = String(req.params.pincode || '').trim();
  if (!/^\d{6}$/.test(pincode) || pincode.startsWith('0')) {
    throw new AppError('Enter a valid 6-digit Indian PIN code', 400);
  }

  let upstream: globalThis.Response;
  try {
    upstream = await fetch('https://api.postalpincode.in/pincode/' + pincode, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new AppError('PIN code lookup is temporarily unavailable. Enter your city and state manually.', 503);
  }
  if (!upstream.ok) throw new AppError('PIN code lookup is temporarily unavailable. Enter your city and state manually.', 503);

  const payload = await upstream.json() as Array<{
    Status?: string;
    PostOffice?: Array<{ Name?: string; District?: string; State?: string; Block?: string; Region?: string; Circle?: string }> | null;
  }>;
  const offices = payload?.[0]?.PostOffice || [];
  if (payload?.[0]?.Status !== 'Success' || offices.length === 0) {
    throw new AppError('PIN code was not found. Check the 6 digits and try again.', 404);
  }
  const district = String(offices[0].District || '').trim();
  const state = String(offices[0].State || '').trim();
  if (!district || !state) throw new AppError('Location details are unavailable for this PIN code. Enter them manually.', 503);

  return res.json({
    success: true,
    data: {
      pincode, district, state,
      post_offices: offices.map(office => ({ name: office.Name || '', block: office.Block || '', region: office.Region || '', circle: office.Circle || '' })),
    },
  });
});

export default router;