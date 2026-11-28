import { PoolClient } from 'pg';

export type TransactionalEmailEvent =
  | 'order_confirmation'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'return_received'
  | 'return_decision'
  | 'refund_confirmed';

/**
 * Add an email to the outbox inside the caller's business transaction.
 * The unique event key makes repeated route/webhook handling idempotent.
 */
export async function enqueueTransactionalEmail(
  client: PoolClient,
  eventKey: string,
  eventType: TransactionalEmailEvent,
  recipientEmail: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const recipient = recipientEmail.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return;
  await client.query(
    `INSERT INTO public.transactional_email_outbox (event_key,event_type,recipient_email,payload)
     VALUES ($1,$2,$3,$4::jsonb)
     ON CONFLICT (event_key) DO NOTHING`,
    [eventKey, eventType, recipient, JSON.stringify(payload)],
  );
}
