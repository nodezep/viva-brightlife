import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';

function mapTwilioStatus(status: string) {
  const normalized = status.toLowerCase();

  if (['queued', 'accepted', 'sending'].includes(normalized)) {
    return {status: 'sent', deliveryStatus: 'sent'} as const;
  }

  if (['sent'].includes(normalized)) {
    return {status: 'sent', deliveryStatus: 'sent'} as const;
  }

  if (['delivered', 'read'].includes(normalized)) {
    return {status: 'sent', deliveryStatus: 'delivered'} as const;
  }

  if (['undelivered', 'failed', 'canceled'].includes(normalized)) {
    return {status: 'failed', deliveryStatus: 'failed'} as const;
  }

  return {status: 'sent', deliveryStatus: 'sent'} as const;
}

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.SMS_WEBHOOK_SECRET;
  const secret = request.nextUrl.searchParams.get('secret');

  if (configuredSecret && secret !== configuredSecret) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const form = await request.formData();
  const messageSid = String(form.get('MessageSid') ?? '');
  const messageStatus = String(form.get('MessageStatus') ?? '');
  const errorCode = String(form.get('ErrorCode') ?? '');
  const errorMessage = String(form.get('ErrorMessage') ?? '');

  if (!messageSid) {
    return NextResponse.json({ok: true});
  }

  const mapping = mapTwilioStatus(messageStatus);

  const supabase = createAdminClient();

  const updatePayload: Record<string, unknown> = {
    status: mapping.status,
    delivery_status: mapping.deliveryStatus,
    provider_payload: Object.fromEntries(form.entries()),
    error_message:
      errorCode || errorMessage
        ? `Twilio ${errorCode || ''} ${errorMessage || ''}`.trim()
        : null
  };

  if (mapping.deliveryStatus === 'delivered') {
    updatePayload.delivered_at = new Date().toISOString();
  }

  await supabase
    .from('sms_reminders')
    .update(updatePayload)
    .eq('provider_message_id', messageSid);

  return new NextResponse('ok', {status: 200});
}