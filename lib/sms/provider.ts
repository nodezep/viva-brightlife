export type SmsProviderResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
};

function normalizePhone(phone: string) {
  const stripped = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  if (stripped.startsWith('+')) {
    return stripped;
  }
  return `+${stripped}`;
}

async function sendWithTwilio(phone: string, message: string): Promise<SmsProviderResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.SMS_FROM;

  if (!sid || !token || !from) {
    return {ok: false, error: 'Missing Twilio configuration'};
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const body = new URLSearchParams({
    To: normalizePhone(phone),
    From: from,
    Body: message
  });

  const baseUrl = process.env.APP_BASE_URL;
  const webhookSecret = process.env.SMS_WEBHOOK_SECRET;
  if (baseUrl) {
    const callback = new URL('/api/sms/webhooks/twilio', baseUrl);
    if (webhookSecret) {
      callback.searchParams.set('secret', webhookSecret);
    }
    body.set('StatusCallback', callback.toString());
  }

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const payload = (await response.json()) as {sid?: string; message?: string};

  if (!response.ok) {
    return {ok: false, error: payload.message ?? 'Twilio request failed'};
  }

  return {ok: true, providerMessageId: payload.sid};
}

export async function sendSms(phone: string, message: string): Promise<SmsProviderResult> {
  const provider = (process.env.SMS_PROVIDER ?? 'mock').toLowerCase();

  if (provider === 'mock') {
    return {ok: true, providerMessageId: `mock-${Date.now()}`};
  }

  if (provider === 'twilio') {
    return sendWithTwilio(phone, message);
  }

  return {ok: false, error: `Unsupported SMS_PROVIDER: ${provider}`};
}