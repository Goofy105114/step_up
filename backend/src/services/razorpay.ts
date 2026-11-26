import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler';

const credentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || keyId.includes('placeholder') || keySecret.includes('placeholder')) {
    throw new AppError('Online payments are not configured. Choose Cash on Delivery or contact the site administrator.', 503);
  }
  return { keyId, keySecret };
};

export async function createRazorpayOrder(amountRupees: number, receipt: string, notes: Record<string, string>) {
  const { keyId, keySecret } = credentials();
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: Math.round(amountRupees * 100), currency: 'INR', receipt: receipt.slice(0, 40), notes }),
  });
  const payload = await response.json() as any;
  if (!response.ok || !payload.id) {
    throw new AppError(payload.error?.description || 'Unable to start secure online payment. Please try again or choose Cash on Delivery.', 502);
  }
  return { id: String(payload.id), amount: Number(payload.amount), currency: String(payload.currency), keyId };
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const { keySecret } = credentials();
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest();
  let received: Buffer;
  try { received = Buffer.from(signature, 'hex'); } catch { return false; }
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  let received: Buffer;
  try { received = Buffer.from(signature, 'hex'); } catch { return false; }
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export async function fetchRazorpayPayment(paymentId: string) {
  const { keyId, keySecret } = credentials();
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` },
  });
  const payload = await response.json() as any;
  if (!response.ok) throw new AppError('Unable to confirm payment status with Razorpay. Please retry shortly.', 502);
  return payload;
}
