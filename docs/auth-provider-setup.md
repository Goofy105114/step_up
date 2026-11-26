# STEPUP authentication provider setup

The API uses the MSG91 OTP Widget for email and mobile verification and Resend for password-reset email delivery.

## Render environment variables

Set these on the Render API service (do not commit real values):

- `MSG91_AUTH_KEY`: MSG91 server-side Auth Key.
- `MSG91_WIDGET_ID`: Widget ID configured with both Email and SMS channels.
- `RESEND_API_KEY`: Resend API key.
- `RESEND_FROM_EMAIL`: A sender address verified in Resend.
- `FRONTEND_URL`: The production STEPUP frontend origin, used to build password-reset links.

## MSG91 setup

1. Create or open an OTP Widget in MSG91.
2. Enable Email and SMS channels in that widget.
3. Configure the widget to allow email and mobile identifiers and set the desired expiry and retry limits.
4. Copy its Widget ID and the server-side Auth Key into Render environment variables.
5. Test email and SMS delivery using your own contact details before enabling the flow for customers.

MSG91's widget flow is send OTP -> retry (optional) -> verify OTP -> verify the resulting access token. The API performs the server-side calls; the Auth Key is never exposed in the browser.

## Resend setup

1. Create a Resend account and add a sending domain.
2. Publish the DNS records Resend asks for and wait for domain verification.
3. Create an API key and set it as `RESEND_API_KEY`.
4. Set `RESEND_FROM_EMAIL` to an address at the verified domain (for example, `STEPUP <accounts@your-domain>`).

Do not use a made-up sender or a domain you do not control. Resend will reject unverified senders.

## Rollout notes

- The OTP challenge and reset-token tables are stored in Supabase with RLS enabled and direct client grants revoked.
- Password-reset links expire after 30 minutes and are single-use; only a SHA-256 token hash is stored.
- OTP verification tickets are signed with the API's existing `JWT_SECRET` and expire after 10 minutes.
- Configure provider credentials before enabling customer sign-up and OTP sign-in in production. Without them, send/reset requests return a configuration error rather than pretending a message was sent.
- Run an end-to-end test for both email and mobile before production rollout.
