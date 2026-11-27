import { Router, Request, Response } from 'express';
import { query } from '../db/pool';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const result = await query("SELECT setting_value FROM store_settings WHERE setting_key='legal_policies'");
  if (!result.rows[0]) return res.status(503).json({ success: false, message: 'Legal policies are not configured yet' });
  const policies = (result.rows[0].setting_value?.policies || [])
    .filter((item: any) => item.status === 'published')
    .map((item: any) => ({ slug: item.slug, title: item.title }));
  return res.json({ success: true, data: policies });
});

router.get('/:slug', async (req: Request, res: Response) => {
  const allowed = ['privacy', 'terms', 'shipping', 'returns'];
  if (!allowed.includes(req.params.slug)) {
    return res.status(404).json({ success: false, message: 'Policy not found' });
  }
  const result = await query(
    "SELECT setting_value FROM store_settings WHERE setting_key='legal_policies'"
  );
  if (!result.rows[0]) {
    return res.status(503).json({ success: false, message: 'Legal policies are not configured yet' });
  }
  const policy = result.rows[0].setting_value?.policies?.find(
    (item: any) => item.slug === req.params.slug && item.status === 'published'
  );
  if (!policy) {
    return res.status(404).json({ success: false, message: 'This policy is not published yet' });
  }
  return res.json({ success: true, data: { slug: policy.slug, title: policy.title, content: policy.content, updated_at: result.rows[0].setting_value.last_reviewed_at } });
});

export default router;
