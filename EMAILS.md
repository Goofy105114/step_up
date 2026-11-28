# STEPUP email delivery

## Verified repository status

The backend currently contains one Resend-backed transactional email flow:

- **Password reset:** the auth route calls `sendPasswordResetEmail` from `backend/src/services/passwordResetEmail.ts`.

The following events are **not yet implemented as verified Resend email triggers** in the active Render backend:

- Order placed / confirmation
- Order shipped / tracking update
- Order delivered
- Customer return requested / return decision
- Refund confirmed
- Newsletter welcome / subscription

Do not describe these notifications as live until their event triggers, templates, recipient handling, failure behavior, and tests have been implemented and verified.

## Required Render environment variables

Configure these in the company-owned Render service. Never commit values to Git:

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API authentication |
| `RESEND_FROM_EMAIL` | Sender address on a domain verified by the company in Resend |

The Render Blueprint declares these values as externally supplied environment variables. Adding the declarations does not create credentials or verify a sending domain.

## Domain and sender readiness

Before sending production mail:

1. Add the company-owned sending domain in Resend.
2. Publish the exact DNS records Resend provides for domain verification and DKIM.
3. Configure SPF without creating conflicting SPF records.
4. Publish a DMARC policy appropriate to the company's mail setup.
5. Verify the intended sender address/domain in Resend.
6. Send and receive test messages, including checking spam placement and authentication headers.

A transactional sender is not the same thing as a staffed support mailbox. Set up and monitor the company's support mailbox separately with its chosen email-hosting provider, including inbound MX records and account recovery controls.

## Delivery implementation requirements

When adding the remaining notification triggers:

- Send only after the associated order/payment/return/refund transaction has committed.
- Make delivery retry-safe and idempotent; webhook retries or repeated admin actions must not send duplicate customer messages.
- Do not let an email provider outage roll back a successful order, payment, return, or refund.
- Record delivery attempts and provider message IDs without storing API secrets or unnecessary personal data.
- Use verified recipient addresses from the database and escape all user-controlled values in HTML templates.
- Never invent delivery estimates, refund completion, return approval, discount codes, or other business promises. Include them only when confirmed by company settings or provider state.
- Keep templates accessible, mobile-friendly, and provide a plain-text alternative.

## Current limitation

There is no verified `/api/emails/send-test` endpoint in the active backend. Do not use an undocumented test endpoint. Test through an authenticated internal test workflow once one has been implemented, or use the Resend dashboard's own test facilities.

**Production status:** password-reset email code exists; actual delivery is unverified until the company configures a valid Resend key, verified sender domain, and tests the live service. All other listed lifecycle notifications remain pending implementation.
