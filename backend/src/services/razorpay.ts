import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler';

const REQUEST_TIMEOUT_MS = 15_000;

const credentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || keyId.includes('placeholder') || keySecret.includes('placeholder')) {
    throw new AppError('Online payments are not configured. Choose Cash on Delivery or contact the site administrator.', 503);
  }
  return { keyId, keySecret };
};

/**
 * Keep provider calls bounded and provider error bodies private. Razorpay error
 * descriptions are useful for server-side diagnostics but must not become
 * customer-facing API messages.
 */
async function razorpayRequest(path: string, options: {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  failureMessage: string;
}) {
  const { keyId, keySecret } = credentials();
  let response: Response;
  try {
    response = await fetch(`https://api.razorpay.com/v1${path}`, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new AppError('Razorpay is temporarily unavailable. Please retry shortly.', 503);
  }

  let payload: any;
  try {
    payload = await response.json();
  } catch {
    throw new AppError('Razorpay returned an invalid response. Please retry shortly.', 502);
  }

  if (!response.ok || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError(options.failureMessage, 502);
  }
  return payload;
}

export async function createRazorpayOrder(amountRupees: number, receipt: string, notes: Record<string, string>) {
  if (!Number.isFinite(amountRupees) || amountRupees <= 0 ||
      !Number.isSafeInteger(Math.round(amountRupees * 100))) {
    throw new AppError('The order amount is invalid. Please review your cart and try again.', 400);
  }
  if (typeof receipt !== 'string' || !receipt.trim() || typeof notes !== 'object' || notes === null || Array.isArray(notes)) {
    throw new AppError('The payment order details are invalid.', 400);
  }
  const amountPaise = Math.round(amountRupees * 100);
  const payload = await razorpayRequest('/orders', {
    method: 'POST',
    body: { amount: amountPaise, currency: 'INR', receipt: receipt.slice(0, 40), notes },
    failureMessage: 'Unable to start secure online payment. Please try again or choose Cash on Delivery.',
  });
  if (typeof payload.id !== 'string' || !payload.id.trim() ||
      payload.amount !== amountPaise || payload.currency !== 'INR') {
    throw new AppError('Razorpay returned an unexpected payment order. Please retry or contact support.', 502);
  }
  return { id: payload.id, amount: payload.amount, currency: payload.currency, keyId: credentials().keyId };
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

const requireProviderId = (value: string, label: string) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 255 || /[\\r\\n]/.test(value)) {
    throw new AppError(`Invalid ${label}.`, 400);
  }
  return value.trim();
};

export async function fetchRazorpayPayment(paymentId: string) {
  const id = requireProviderId(paymentId, 'Razorpay payment ID');
  return razorpayRequest(`/payments/${encodeURIComponent(id)}`, {
    failureMessage: 'Unable to confirm payment status with Razorpay. Please retry shortly.',
  });
}

export async function fetchRazorpayOrderPayments(orderId: string) {
  const id = requireProviderId(orderId, 'Razorpay order ID');
  const payload = await razorpayRequest(`/orders/${encodeURIComponent(id)}/payments`, {
    failureMessage: 'Unable to confirm the payment session status. Please check your order status before retrying.',
  });
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function fetchRazorpayPaymentRefunds(paymentId: string) {
  const id = requireProviderId(paymentId, 'Razorpay payment ID');
  const payload = await razorpayRequest(`/payments/${encodeURIComponent(id)}/refunds`, {
    failureMessage: 'Unable to verify refund details with Razorpay. Please retry shortly.',
  });
  return Array.isArray(payload.items) ? payload.items : [];
}
