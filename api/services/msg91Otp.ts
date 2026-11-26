type Msg91Response = { type?: string; message?: string; reqId?: string; request_id?: string; [key: string]: unknown };

const config = () => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const widgetId = process.env.MSG91_WIDGET_ID;
  if (!authKey || !widgetId) throw new Error('OTP provider is not configured');
  return { authKey, widgetId };
};

async function msg91(path: string, body: Record<string, unknown>): Promise<Msg91Response> {
  const { authKey } = config();
  const response = await fetch(`https://api.msg91.com/api/v5/widget/${path}`, {
    method: 'POST',
    headers: { authkey: authKey, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json() as Msg91Response;
  if (!response.ok || payload.type !== 'success') {
    const message = typeof payload.message === 'string' ? payload.message : 'OTP provider request failed';
    throw new Error(message);
  }
  return payload;
}

export async function sendOtp(identifier: string): Promise<string> {
  const { widgetId } = config();
  const payload = await msg91('sendOtp', { widgetId, identifier });
  const requestId = payload.message || payload.reqId || payload.request_id;
  if (typeof requestId !== 'string' || !requestId) throw new Error('OTP provider did not return a request ID');
  return requestId;
}

export async function resendOtp(requestId: string): Promise<void> {
  const { widgetId } = config();
  await msg91('retryOtp', { widgetId, reqId: requestId });
}

export async function verifyOtp(requestId: string, otp: string): Promise<string> {
  const { widgetId } = config();
  const payload = await msg91('verifyOtp', { widgetId, reqId: requestId, otp });
  if (typeof payload.message !== 'string' || !payload.message) throw new Error('OTP provider did not return an access token');
  return payload.message;
}

export async function verifyOtpAccessToken(accessToken: string): Promise<string> {
  const payload = await msg91('verifyAccessToken', { 'access-token': accessToken });
  if (typeof payload.message !== 'string' || !payload.message) throw new Error('OTP provider could not validate the access token');
  return payload.message;
}
