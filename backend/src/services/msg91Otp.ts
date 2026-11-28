type Msg91Response = {
  type?: string;
  message?: string;
  reqId?: string;
  request_id?: string;
  [key: string]: unknown;
};

const REQUEST_TIMEOUT_MS = 12_000;

const config = () => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const widgetId = process.env.MSG91_WIDGET_ID;
  if (!authKey || !widgetId) throw new Error('OTP provider is not configured');
  return { authKey, widgetId };
};

async function msg91(path: string, body: Record<string, unknown>): Promise<Msg91Response> {
  const { authKey } = config();
  let response: Response;
  try {
    response = await fetch(`https://api.msg91.com/api/v5/widget/${path}`, {
      method: 'POST',
      headers: { authkey: authKey, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // Do not leak network details or credentials into API responses/logs.
    throw new Error('OTP provider is temporarily unavailable');
  }

  let payload: Msg91Response;
  try {
    payload = await response.json() as Msg91Response;
  } catch {
    throw new Error('OTP provider returned an invalid response');
  }

  if (!response.ok || payload.type !== 'success') {
    // Provider messages can contain implementation details; expose a stable message.
    throw new Error('OTP provider request was not successful');
  }
  return payload;
}

const requireString = (value: unknown, message: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(message);
  return value.trim();
};

export async function sendOtp(identifier: string): Promise<string> {
  const normalized = requireString(identifier, 'OTP identifier is required');
  if (normalized.length > 254 || /[\r\n]/.test(normalized)) throw new Error('OTP identifier is invalid');
  const { widgetId } = config();
  const payload = await msg91('sendOtp', { widgetId, identifier: normalized });
  // MSG91 widget APIs return the request ID in message for sendOtp.
  const requestId = payload.message || payload.reqId || payload.request_id;
  return requireString(requestId, 'OTP provider did not return a request ID');
}

export async function resendOtp(requestId: string): Promise<void> {
  const normalized = requireString(requestId, 'OTP request ID is required');
  if (normalized.length > 200 || /[\r\n]/.test(normalized)) throw new Error('OTP request ID is invalid');
  const { widgetId } = config();
  await msg91('retryOtp', { widgetId, reqId: normalized });
}

export async function verifyOtp(requestId: string, otp: string): Promise<string> {
  const normalizedId = requireString(requestId, 'OTP request ID is required');
  if (normalizedId.length > 200 || /[\r\n]/.test(normalizedId)) throw new Error('OTP request ID is invalid');
  if (!/^\d{4,8}$/.test(otp)) throw new Error('OTP is invalid');
  const { widgetId } = config();
  const payload = await msg91('verifyOtp', { widgetId, reqId: normalizedId, otp });
  return requireString(payload.message, 'OTP provider did not return an access token');
}

export async function verifyOtpAccessToken(accessToken: string): Promise<string> {
  const normalized = requireString(accessToken, 'OTP access token is required');
  if (normalized.length > 4096 || /[\r\n]/.test(normalized)) throw new Error('OTP access token is invalid');
  const payload = await msg91('verifyAccessToken', { 'access-token': normalized });
  return requireString(payload.message, 'OTP provider could not validate the access token');
}
