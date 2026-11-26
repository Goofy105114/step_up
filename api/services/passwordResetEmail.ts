import { randomBytes, createHash } from 'crypto';

export const hashResetToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const createResetToken = () => randomBytes(32).toString('base64url');

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error('Email provider is not configured');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Reset your STEPUP password',
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#183d35"><h1>Reset your STEPUP password</h1><p>We received a request to reset the password for your STEPUP account.</p><p><a href="${resetUrl}" style="display:inline-block;background:#075b4e;color:#fff;padding:12px 20px;text-decoration:none;border-radius:8px">Reset password</a></p><p>This link expires in 30 minutes and can only be used once. If you did not request this, you can ignore this email.</p></div>`,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email delivery failed (${response.status}): ${body.slice(0, 300)}`);
  }
}
