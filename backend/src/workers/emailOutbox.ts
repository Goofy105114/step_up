import pool, { query } from '../db/pool';
import { sendTransactionalEmail } from '../services/transactionalEmail';

type EmailEvent =
  | 'order_confirmation' | 'order_shipped' | 'order_delivered'
  | 'order_cancelled' | 'return_received' | 'return_decision' | 'refund_confirmed';

type OutboxJob = {
  id: number;
  event_type: EmailEvent;
  recipient_email: string;
  payload: Record<string, unknown>;
  attempts: number;
};

const POLL_INTERVAL_MS = 5000;
const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 8;
const LEASE_TIMEOUT_MINUTES = 10;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function claimBatch(): Promise<OutboxJob[]> {
  const result = await query(
    `WITH candidates AS (
       SELECT id
       FROM public.transactional_email_outbox
       WHERE (status = 'pending' AND available_at <= NOW())
          OR (status = 'processing' AND locked_at < NOW() - ($2::text || ' minutes')::interval)
       ORDER BY available_at ASC, id ASC
       FOR UPDATE SKIP LOCKED
       LIMIT $1
     )
     UPDATE public.transactional_email_outbox AS outbox
     SET status = 'processing',
         locked_at = NOW(),
         attempts = outbox.attempts + 1
     FROM candidates
     WHERE outbox.id = candidates.id
     RETURNING outbox.id,outbox.event_type,outbox.recipient_email,outbox.payload,outbox.attempts`,
    [BATCH_SIZE, LEASE_TIMEOUT_MINUTES],
  );
  return result.rows as OutboxJob[];
}

async function processJob(job: OutboxJob): Promise<void> {
  try {
    const messageId = await sendTransactionalEmail(job.event_type, job.recipient_email, job.payload || {});
    await query(
      `UPDATE public.transactional_email_outbox
       SET status='sent', provider_message_id=$2, sent_at=NOW(),
           locked_at=NULL, last_error=NULL
       WHERE id=$1 AND status='processing'`,
      [job.id, messageId],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email delivery error';
    const dead = job.attempts >= MAX_ATTEMPTS;
    const backoffSeconds = Math.min(21600, 30 * (2 ** Math.max(0, job.attempts - 1)));
    await query(
      `UPDATE public.transactional_email_outbox
       SET status=$2,
           available_at=CASE WHEN $2='pending' THEN NOW() + ($3::text || ' seconds')::interval ELSE available_at END,
           locked_at=NULL,
           last_error=$4
       WHERE id=$1 AND status='processing'`,
      [job.id, dead ? 'dead' : 'pending', backoffSeconds, message.slice(0, 500)],
    );
    console.error('[email-worker] delivery attempt failed', { jobId: job.id, attempt: job.attempts, dead });
  }
}

async function run(): Promise<void> {
  console.log('[email-worker] started');
  let stopping = false;
  const stop = () => { stopping = true; };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);

  while (!stopping) {
    try {
      const jobs = await claimBatch();
      if (!jobs.length) {
        await delay(POLL_INTERVAL_MS);
        continue;
      }
      for (const job of jobs) {
        if (stopping) break;
        await processJob(job);
      }
    } catch (error) {
      console.error('[email-worker] polling failed; will retry', error instanceof Error ? error.message : 'unknown error');
      await delay(POLL_INTERVAL_MS);
    }
  }

  await pool.end();
  console.log('[email-worker] stopped');
}

run().catch(async error => {
  console.error('[email-worker] fatal error', error instanceof Error ? error.message : 'unknown error');
  await pool.end();
  process.exitCode = 1;
});
