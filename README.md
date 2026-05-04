# Viva Brightlife Microfinance Admin System

Next.js 14 + Tailwind + Supabase admin management system for microfinance operations.

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL, Auth, RLS)
- next-intl (EN/SW)
- next-themes (Dark/Light)
- Lucide icons
- React Hook Form + Zod

## Implemented Flow
- Supabase Auth login/logout
- Protected admin routes (redirects unauthenticated users to login)
- Profile bootstrap on first login (`profiles` row)
- Live dashboard metrics from Supabase
- Live loan pages for all loan types (create, list, delete)
- Live reports filters + print/export view
- Live groups and insurance lists from Supabase
- Language toggle EN/SW with localStorage persistence
- Theme toggle dark/light
- SMS reminders module (queue + dispatch + logs + test SMS)

## Required SQL Files
1. Schema + RLS:
- `supabase/migrations/20260309_initial_microfinance_schema.sql`

2. SMS reminders schema:
- `supabase/migrations/20260309_sms_reminders.sql`

3. SMS delivery callback schema:
- `supabase/migrations/20260309_sms_delivery_callbacks.sql`

4. Optional sample data:
- `supabase/seed.sql`

## Local Setup
1. Install dependencies
```bash
npm install
```

2. Configure env
```bash
cp .env.example .env.local
```
Set in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMS_PROVIDER` (`mock`, `twilio`, or `africastalking`)
- `SMS_FROM`
- `SMS_DEFAULT_COUNTRY_CODE` (optional; converts local numbers like `07...` to E.164, e.g. `255` for Tanzania)
- `TWILIO_ACCOUNT_SID` (if using twilio)
- `TWILIO_AUTH_TOKEN` (if using twilio)
- `AFRICASTALKING_USERNAME` (if using Africa's Talking)
- `AFRICASTALKING_API_KEY` (if using Africa's Talking)
- `DEBUG_SMS` (`true` to log provider responses in dev)
- `APP_BASE_URL` (public base URL used for Twilio callbacks)
- `SMS_WEBHOOK_SECRET` (protects webhook route)
- `JOB_SECRET`

3. In Supabase SQL Editor:
- Run `supabase/migrations/20260309_initial_microfinance_schema.sql`
- Run `supabase/migrations/20260309_sms_reminders.sql`
- Run `supabase/migrations/20260309_sms_delivery_callbacks.sql`
- (Optional) Run `supabase/seed.sql`

4. Create an auth user in Supabase (Email/Password).

5. Start app
```bash
npm run dev
```

6. Open:
- `http://localhost:3000/sw/login` (or `/en/login`)

## Safe Deployment Checklist
- Keep `.env.local` out of git (never commit secrets).
- Store secrets in Netlify Environment Variables.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code.
- Verify Supabase RLS policies are restrictive (especially `loan_schedules`).
- Rotate keys immediately if they are ever exposed.
- Run secret scan before every push:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-secrets.ps1
```

## SMS Reminders
Admin UI page:
- `/<locale>/sms-reminders`

Available actions:
- Queue overdue reminders now
- Dispatch queued SMS now
- Send test SMS
- View reminder logs/status

### Twilio Delivery Webhook
When `SMS_PROVIDER=twilio`, outgoing messages include a Twilio `StatusCallback` URL automatically:
- `${APP_BASE_URL}/api/sms/webhooks/twilio?secret=${SMS_WEBHOOK_SECRET}`

Twilio delivery events update:
- `delivery_status` (`sent`, `delivered`, `failed`)
- `delivered_at`
- `provider_payload`

### Cron/Background Jobs
You can schedule these secure endpoints (with header `x-job-token: <JOB_SECRET>`):
- `POST /api/jobs/sms/queue`
- `POST /api/jobs/sms/dispatch`

Suggested schedule:
- Queue: daily 07:30 (Africa/Dar_es_Salaam)
- Dispatch: every 5-10 minutes

## Verification Status
- `npm run typecheck` passes
- `npm run build` passes

## API Routes Added
- `POST /api/profile/bootstrap`
- `POST /api/auth/logout`
- `POST /api/loans`
- `DELETE /api/loans?id=<loan_id>`
- `POST /api/groups`
- `POST/DELETE /api/groups/[groupId]/members`
- `POST /api/sms/reminders/queue`
- `POST /api/sms/reminders/dispatch`
- `POST /api/sms/reminders/test`
- `POST /api/jobs/sms/queue`
- `POST /api/jobs/sms/dispatch`
