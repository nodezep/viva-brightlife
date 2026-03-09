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

## Required SQL Files
1. Schema + RLS:
- `supabase/migrations/20260309_initial_microfinance_schema.sql`

2. Optional sample data:
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

3. In Supabase SQL Editor:
- Run `supabase/migrations/20260309_initial_microfinance_schema.sql`
- (Optional) Run `supabase/seed.sql`

4. Create an auth user in Supabase (Email/Password).

5. Start app
```bash
npm run dev
```

6. Open:
- `http://localhost:3000/sw/login` (or `/en/login`)

## Verification Status
- `npm run typecheck` passes
- `npm run build` passes

## API Routes Added
- `POST /api/profile/bootstrap`
- `POST /api/auth/logout`
- `POST /api/loans`
- `DELETE /api/loans?id=<loan_id>`