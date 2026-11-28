# STEPUP database migration inventory

## Scope and safety

This is a source-code inventory of `backend/src/db/migrate.ts` and the SQL files currently present under `backend/src/db/`. It is not a live database inspection. No database was connected to, no migration was applied, and no production schema state is asserted here.

The active Render service runs `npm start`; its Blueprint does not invoke `db:migrate`. The migration script is a separate manual command. Do not infer that a migration file exists in production merely because it exists in Git.

## Migration runner registry

At the time of this audit, `backend/src/db/migrate.ts` registers only:

1. `stepup-fit-research-migration.sql`
2. `razorpay-checkout-migration.sql`
3. `store-settings-migration.sql`
4. `supabase-public-privileges-migration.sql`

The following SQL files exist in the repository but are not registered in that runner:

- `auth-otp-reset-migration.sql`
- `customer-grievances-migration.sql`
- `legal-policy-framework-migration.sql`
- `order-policy-acceptances-migration.sql`
- `order-seller-snapshots-migration.sql`
- `order-tracking-carrier-migration.sql`
- `order-tracking-url-migration.sql`
- `partial-refund-reconciliation-migration.sql`
- `payment-refund-reconciliation-migration.sql`
- `product-legal-declarations-migration.sql`
- `product-price-history-migration.sql`
- `razorpay-webhook-audit-migration.sql`
- `return-request-classification-migration.sql`

## Important dependency ordering

The files are not safe to register alphabetically. Source review shows dependencies including:

- `legal-policy-framework-migration.sql` inserts into `store_settings`, so `store-settings-migration.sql` must precede it.
- `order-seller-snapshots-migration.sql` is used alongside the `legal_policies` store setting; the table itself references `orders`.
- `order-policy-acceptances-migration.sql` references `orders` and `users`.
- `payment-refund-reconciliation-migration.sql` creates `payment_refund_reconciliations`; `partial-refund-reconciliation-migration.sql` alters it and must run afterwards.
- `razorpay-webhook-audit-migration.sql` creates the webhook event table and adds `orders.razorpay_payment_id`.
- `return-request-classification-migration.sql` alters `return_requests`, which is created by the fit/research migration.
- `auth-otp-reset-migration.sql` references `users` and the Supabase `extensions.uuid_generate_v4()` function; extension/schema availability must be confirmed on the target Supabase project.
- `product-price-history-migration.sql` backfills an audit baseline for every existing product and installs a trigger. This is a data-writing migration, not merely a table declaration.

## High-risk finding: do not blindly register every file

Several migrations explicitly say they are manual-review-only. Some change security privileges across the entire `public` schema, some create historical baselines, and others add tables or columns that current routes expect. Registering all of them without checking the target database could cause startup/operator surprises, partial deployment failures, or privilege changes.

The current runner also executes `schema.sql` before registered migrations. The base schema uses `CREATE TABLE IF NOT EXISTS`, which does not reconcile an existing table's missing columns or constraints. A successful base-schema execution therefore does not prove the database is up to date.

## Required pre-production reconciliation

Before applying any pending migration to the company database:

1. Take and verify a restorable backup.
2. Inspect `stepup_schema_migrations` and actual table/column/index/constraint state on the target project.
3. Compare each SQL file against the live schema, not just the migration ledger.
4. Confirm the database role used by Render retains the required application privileges after any privilege-hardening migration.
5. Apply reviewed migrations in an explicitly approved order, one controlled batch at a time.
6. Run `db:verify`, API smoke tests, payment/refund checks, order/return checks, and admin checks.
7. Record applied migration IDs and the verification evidence.

## Current status

- Repository migration files inventoried: yes.
- Runner registry compared with repository files: yes.
- Live Supabase schema inspected: no.
- Backup/restore verified: no.
- Unregistered migrations applied: no.
- Production migration approved: no.

This document is an engineering audit, not legal advice or proof of production database compliance.
