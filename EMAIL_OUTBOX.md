# STEPUP transactional email outbox

## What is implemented

- Checkout queues an order-received email in the same database transaction as the order.
- Admin transitions to shipped, delivered, and cancelled queue a matching email in the same transaction as the status-history record.
- Customer return requests, admin return decisions, and provider-verified Razorpay refunds are also queued in their respective database transactions.
- Stable event keys prevent the same source event from being enqueued twice.
- A separate Render background worker claims jobs with `FOR UPDATE SKIP LOCKED`, sends through the shared Resend service, and records provider message IDs.
- Failed jobs retry with exponential backoff, up to eight attempts, then move to `dead` for operator review.
- Jobs stuck in `processing` for more than ten minutes are eligible for recovery.

## Deployment order (manual, company-authorised)

1. Confirm a restorable Supabase backup.
2. Review the new additive migration `transactional-email-outbox-migration.sql` against the target schema and permissions.
3. Run `npm run db:migrate` manually from the backend against the intended database after explicit company approval. The Render Blueprint does not run migrations automatically.
4. Verify `transactional_email_outbox` exists and the Render database role can insert/update/select it.
5. Configure the Resend API key and a sender address on a domain verified by the company.
6. Deploy the API and background worker from the reviewed Blueprint change.
7. Test with a company-controlled recipient and a test order before enabling real customer notifications.

Do not merge/deploy this Blueprint change or run the migration until the company has approved the target environment and backup.

## Delivery semantics and limitations

This is **at-least-once**, not exactly-once, delivery. If Resend accepts a message but the worker loses its connection before recording the provider message ID, a recovered job may send a duplicate. The unique event key prevents duplicate queue insertion, not every possible duplicate send. Monitor the dead-letter rows and Resend dashboard; do not automatically discard them.

The worker sends sequentially within each claimed batch. It is intentionally separate from checkout and webhook request handling. Provider outages do not roll back an order or fulfilment update because the email job is committed with the business transaction and processed later.

## Current event coverage

| Event | Queue trigger |
|---|---|
| Order received | Customer checkout transaction |
| Shipped | Admin status transition |
| Delivered | Admin status transition |
| Cancelled | Admin status transition |
| Return received | Customer return-request transaction |
| Return decision | Admin return-decision transaction |
| Refund confirmed | Admin reconciliation after Razorpay reports processed |

The current checkout flow only permits COD, so the order-received email is not proof of payment. The email template correctly says the order was received, not that payment was captured.

## Operations

Inspect pending/failed jobs with read-only SQL:

```sql
SELECT id, event_key, event_type, status, attempts,
       available_at, locked_at, provider_message_id, last_error, created_at
FROM public.transactional_email_outbox
WHERE status IN ('pending', 'processing', 'dead')
ORDER BY created_at ASC;
```

Do not store API keys in the database or log full provider responses. Restrict access to this table to the backend service role and authorised operators.
