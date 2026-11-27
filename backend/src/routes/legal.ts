import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import { query } from '../db/pool';

const router = Router();

router.get('/business-disclosures', async (_req: Request, res: Response) => {
  const result = await query("SELECT setting_value FROM store_settings WHERE setting_key='legal_policies'");
  if (!result.rows[0]) return res.json({ success: true, data: null });
  const identity = result.rows[0].setting_value?.business_identity;
  const requiredIdentityFields = [
    'legal_name', 'registered_address', 'customer_care_email', 'customer_care_phone',
    'grievance_officer_name', 'grievance_officer_designation', 'grievance_email', 'grievance_phone',
  ];
  const validEmail = (value: unknown) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (!identity?.confirmed || requiredIdentityFields.some(field => !String(identity[field] || '').trim()) ||
      !validEmail(identity.customer_care_email) || !validEmail(identity.grievance_email) ||
      identity.gst_status === 'unverified') {
    return res.json({ success: true, data: null });
  }
  return res.json({
    success: true,
    data: {
      legal_name: identity.legal_name,
      registered_address: identity.registered_address,
      customer_care_email: identity.customer_care_email,
      customer_care_phone: identity.customer_care_phone,
      grievance_officer_name: identity.grievance_officer_name,
      grievance_officer_designation: identity.grievance_officer_designation,
      grievance_email: identity.grievance_email,
      grievance_phone: identity.grievance_phone,
      gstin: identity.gst_status === 'verified' ? identity.gstin : null,
    },
  });
});

router.get('/', async (_req: Request, res: Response) => {
  const result = await query("SELECT setting_value FROM store_settings WHERE setting_key='legal_policies'");
  if (!result.rows[0]) return res.status(503).json({ success: false, message: 'Legal policies are not configured yet' });
  const policies = (result.rows[0].setting_value?.policies || [])
    .filter((item: any) => item.status === 'published')
    .map((item: any) => ({
      slug: item.slug,
      title: item.title,
      content_hash: createHash('sha256').update(String(item.content || ''), 'utf8').digest('hex'),
    }));
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
