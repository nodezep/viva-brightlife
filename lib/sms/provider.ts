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

async function sendWithAfricasTalking(
  phone: string,
  message: string
): Promise<SmsProviderResult> {
  const username = process.env.AFRICASTALKING_USERNAME;
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const from = process.env.SMS_FROM;
  const debug = process.env.DEBUG_SMS === 'true';

  if (!username || !apiKey) {
    if (debug) {
      console.warn('[SMS][AT] Missing credentials', {
        hasUsername: Boolean(username),
        apiKeyPrefix: apiKey ? apiKey.slice(0, 6) : null
      });
    }
    return {ok: false, error: 'Missing Africa’s Talking configuration'};
  }

  const endpoint = 'https://api.africastalking.com/version1/messaging';
  const body = new URLSearchParams({
    username,
    to: normalizePhone(phone),
    message
  });

  if (from) {
    body.set('from', from);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const raw = await response.text();
  if (debug) {
    console.warn('[SMS][AT] Response', {
      status: response.status,
      statusText: response.statusText,
      raw: raw.slice(0, 200)
    });
  }
  let payload:
    | {
        SMSMessageData?: {
          Recipients?: Array<{messageId?: string; status?: string; statusCode?: number}>;
        };
        errorMessage?: string;
      }
    | null = null;

  try {
    payload = JSON.parse(raw);
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      error:
        payload?.errorMessage ??
        raw?.slice(0, 200) ??
        'Africa’s Talking request failed'
    };
  }

  const messageId = payload?.SMSMessageData?.Recipients?.[0]?.messageId;
  return {ok: true, providerMessageId: messageId};
}

export async function sendSms(phone: string, message: string): Promise<SmsProviderResult> {
  const provider = (process.env.SMS_PROVIDER ?? 'mock').toLowerCase();

  if (provider === 'mock') {
    return {ok: true, providerMessageId: `mock-${Date.now()}`};
  }

  if (provider === 'twilio') {
    return sendWithTwilio(phone, message);
  }

  if (provider === 'africastalking') {
    return sendWithAfricasTalking(phone, message);
  }

  return {ok: false, error: `Unsupported SMS_PROVIDER: ${provider}`};
}
