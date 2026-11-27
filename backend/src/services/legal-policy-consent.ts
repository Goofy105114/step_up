import { createHash } from 'crypto';
import { PoolClient } from 'pg';
import { Request } from 'express';
import { AppError } from '../middleware/errorHandler';

const REQUIRED_POLICY_SLUGS = ['privacy', 'terms', 'shipping', 'returns'] as const;

type PolicyAcceptance = { slug: string; content_hash: string };

export const recordPolicyConsent = async (
  client: PoolClient,
  orderId: string,
  userId: string,
  supplied: unknown
) => {
  if (!Array.isArray(supplied) || supplied.length !== REQUIRED_POLICY_SLUGS.length) {
    throw new AppError('Review and accept all current STEPUP policies before placing your order', 400);
  }

  const acceptances = supplied as PolicyAcceptance[];
  if (acceptances.some(item => !item || typeof item.slug !== 'string' ||
      typeof item.content_hash !== 'string' || !/^[a-f0-9]{64}$/.test(item.content_hash)) ||
      new Set(acceptances.map(item => item.slug)).size !== REQUIRED_POLICY_SLUGS.length ||
      REQUIRED_POLICY_SLUGS.some(slug => !acceptances.some(item => item.slug === slug))) {
    throw new AppError('Policy acceptance details are invalid. Refresh checkout and try again.', 400);
  }

  const settings = await client.query(
    "SELECT setting_value FROM store_settings WHERE setting_key='legal_policies' FOR SHARE"
  );
  const published = (settings.rows[0]?.setting_value?.policies || [])
    .filter((policy: any) => REQUIRED_POLICY_SLUGS.includes(policy.slug) && policy.status === 'published');

  if (published.length !== REQUIRED_POLICY_SLUGS.length) {
    throw new AppError('Checkout is unavailable until all required STEPUP policies are published', 503);
  }

  const current = published.map((policy: any) => ({
    slug: policy.slug,
    title: String(policy.title || ''),
    content_hash: createHash('sha256').update(String(policy.content || ''), 'utf8').digest('hex')
  }));

  for (const policy of current) {
    const accepted = acceptances.find(item => item.slug === policy.slug);
    if (!accepted || accepted.content_hash !== policy.content_hash) {
      throw new AppError('A STEPUP policy has changed. Review the latest policies and accept them again.', 409);
    }
  }

  for (const policy of current) {
    await client.query(
      `INSERT INTO order_policy_acceptances
        (order_id, user_id, policy_slug, policy_title, content_sha256)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, userId, policy.slug, policy.title, policy.content_hash]
    );
  }
};
