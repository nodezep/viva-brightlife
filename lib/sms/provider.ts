export type SmsProviderResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
};

function normalizePhone(phone: string) {
  const raw = phone.trim();
  if (!raw) {
    return '';
  }

  // Keep a leading "+" (E.164), but otherwise strip to digits only.
  const hasPlus = raw.startsWith('+');
  const digitsOnly = raw.replace(/[^\d]/g, '');

  if (hasPlus) {
    return `+${digitsOnly}`;
  }

  // Handle international prefix like 00...
  if (digitsOnly.startsWith('00') && digitsOnly.length > 2) {
    return `+${digitsOnly.slice(2)}`;
  }

  const defaultCountryCodeRaw = (process.env.SMS_DEFAULT_COUNTRY_CODE ?? '').trim();
  const defaultCountryCode = defaultCountryCodeRaw.replace(/[^\d]/g, '');

  // Handle local format starting with 0 (e.g., 07XXXXXXXX -> +2557XXXXXXXX)
  if (digitsOnly.startsWith('0') && defaultCountryCode) {
    return `+${defaultCountryCode}${digitsOnly.slice(1)}`;
  }

  // Handle local format starting with 7 or 6 (e.g., 7XXXXXXXX -> +2557XXXXXXXX)
  // Tanzania numbers are usually 9 digits after the leading 0.
  if (
    defaultCountryCode === '255' &&
    digitsOnly.length === 9 &&
    (digitsOnly.startsWith('7') || digitsOnly.startsWith('6'))
  ) {
    return `+${defaultCountryCode}${digitsOnly}`;
  }

  if (defaultCountryCode && digitsOnly.startsWith(defaultCountryCode)) {
    return `+${digitsOnly}`;
  }

  // Fallback: assume caller provided full number without "+".
  return `+${digitsOnly}`;
}

function isValidE164(value: string) {
  return /^\+[1-9]\d{6,14}$/.test(value);
}

async function sendWithTwilio(phone: string, message: string): Promise<SmsProviderResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.SMS_FROM;

  if (!sid || !token || !from) {
    return {ok: false, error: 'Missing Twilio configuration'};
  }

  const to = normalizePhone(phone);
  if (!isValidE164(to)) {
    return {ok: false, error: `Invalid phone number format: ${phone}`};
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const body = new URLSearchParams({
    To: to,
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
    return {ok: false, error: "Missing Africa's Talking configuration"};
  }

  const to = normalizePhone(phone);
  if (!isValidE164(to)) {
    return {ok: false, error: `Invalid phone number format: ${phone}`};
  }

  const endpoint = 'https://api.africastalking.com/version1/messaging';
  const body = new URLSearchParams({
    username,
    to,
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
          Recipients?: Array<{
            messageId?: string;
            status?: string;
            statusCode?: number;
            number?: string;
            cost?: string;
          }>;
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
        "Africa's Talking request failed"
    };
  }

  const recipient = payload?.SMSMessageData?.Recipients?.[0];
  if (!recipient) {
    return {ok: false, error: "Africa's Talking response missing recipient data"};
  }

  if (recipient.status && recipient.status.toLowerCase() !== 'success') {
    const statusCode = recipient.statusCode ?? 'unknown';
    return {
      ok: false,
      error: `Africa's Talking status: ${recipient.status} (code ${statusCode})`
    };
  }

  return {ok: true, providerMessageId: recipient.messageId};
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
