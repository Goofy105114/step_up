type EmailEvent =
  | 'order_confirmation'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'return_received'
  | 'return_decision'
  | 'refund_confirmed';

type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  event: EmailEvent;
};

type ResendResponse = { id?: string; message?: string };

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]!));

const safeText = (value: unknown, maxLength = 500): string => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

const emailLayout = (title: string, content: string): string =>
  '<!doctype html><html><body style="margin:0;padding:24px;background:#f5f7f6;font-family:Arial,sans-serif;color:#183d35">' +
  '<main style="max-width:560px;margin:0 auto;padding:28px;background:#fff;border-radius:12px">' +
  '<p style="font-size:13px;letter-spacing:2px;font-weight:bold">STEPUP</p>' +
  '<h1 style="font-size:24px">' + escapeHtml(title) + '</h1>' +
  content +
  '<p style="font-size:12px;color:#66736f;margin-top:32px">This is an automated order update from STEPUP. If you need help, contact the support address shown on the STEPUP website.</p>' +
  '</main></body></html>';

const paragraph = (label: string, value: string): string =>
  value ? '<p><strong>' + escapeHtml(label) + ':</strong> ' + escapeHtml(value) + '</p>' : '';

function buildEmail(event: EmailEvent, details: Record<string, unknown>): Omit<TransactionalEmail, 'to'> {
  const orderNumber = safeText(details.orderNumber, 80);
  const trackingNumber = safeText(details.trackingNumber, 100);
  const trackingUrl = safeText(details.trackingUrl, 2048);
  const carrier = safeText(details.carrier, 100);
  const note = safeText(details.note, 1000);
  const returnStatus = safeText(details.returnStatus, 80);
  const refundAmount = safeText(details.refundAmount, 40);

  const definitions: Record<EmailEvent, { subject: string; title: string; message: string }> = {
    order_confirmation: {
      subject: 'Your STEPUP order is confirmed',
      title: 'Order received',
      message: 'We have received your order. You can view its latest status in your STEPUP account.',
    },
    order_shipped: {
      subject: 'Your STEPUP order has shipped',
      title: 'Your order is on its way',
      message: 'Your order has been marked as shipped. Tracking information is included below when available.',
    },
    order_delivered: {
      subject: 'Your STEPUP order was marked delivered',
      title: 'Delivery update',
      message: 'The carrier or fulfilment team has marked this order as delivered. If you have not received it, please contact support.',
    },
    order_cancelled: {
      subject: 'Your STEPUP order was cancelled',
      title: 'Order cancelled',
      message: 'Your order has been cancelled. Any payment or refund status is shown separately in your account.',
    },
    return_received: {
      subject: 'We received your STEPUP return request',
      title: 'Return request received',
      message: 'Your return request has been received. It is not yet approved; you can follow its status in your account.',
    },
    return_decision: {
      subject: 'There is an update to your STEPUP return',
      title: 'Return request update',
      message: 'Your return request status has been updated. Please review the status in your STEPUP account.',
    },
    refund_confirmed: {
      subject: 'Your STEPUP refund has been confirmed',
      title: 'Refund update',
      message: 'The payment provider has confirmed a refund update. Bank or card posting times may vary.',
    },
  };
  const definition = definitions[event];
  const fields = [
    paragraph('Order number', orderNumber),
    paragraph('Carrier', carrier),
    paragraph('Tracking number', trackingNumber),
    paragraph('Return status', returnStatus),
    paragraph('Refund amount', refundAmount),
    paragraph('Additional update', note),
  ].join('');
  const trackingLink = trackingUrl
    ? '<p><a href="' + escapeHtml(trackingUrl) + '">View shipment tracking</a></p>'
    : '';
  return {
    event,
    subject: definition.subject,
    text: [
      'STEPUP',
      definition.title,
      definition.message,
      orderNumber ? 'Order number: ' + orderNumber : '',
      carrier ? 'Carrier: ' + carrier : '',
      trackingNumber ? 'Tracking number: ' + trackingNumber : '',
      trackingUrl ? 'Tracking: ' + trackingUrl : '',
      returnStatus ? 'Return status: ' + returnStatus : '',
      refundAmount ? 'Refund amount: ' + refundAmount : '',
      note ? 'Additional update: ' + note : '',
    ].filter(Boolean).join('\n\n'),
    html: emailLayout(definition.title, '<p>' + escapeHtml(definition.message) + '</p>' + fields + trackingLink),
  };
}

/**
 * Sends one already-authorized transactional message.
 * Callers must invoke this only after the associated database transaction commits.
 * Durable retries/idempotency are intentionally delegated to the planned outbox worker;
 * this helper itself does not claim at-least-once delivery.
 */
export async function sendTransactionalEmail(
  event: EmailEvent,
  to: string,
  details: Record<string, unknown> = {},
): Promise<string> {
  const recipient = safeText(to, 255);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new Error('Transactional email recipient is invalid');
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error('Email provider is not configured');

  const message = buildEmail(event, details);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  let payload: ResendResponse = {};
  try {
    payload = await response.json() as ResendResponse;
  } catch {
    // Keep provider response bodies out of customer-facing errors and application logs.
  }
  if (!response.ok) {
    throw new Error('Transactional email delivery failed with provider status ' + response.status);
  }
  if (typeof payload.id !== 'string' || !payload.id) {
    throw new Error('Email provider did not return a message ID');
  }
  return payload.id;
}
