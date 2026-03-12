create table if not exists public.admission_books (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  has_book boolean not null default false,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id)
);

drop trigger if exists trg_admission_books_updated_at on public.admission_books;
create trigger trg_admission_books_updated_at
before update on public.admission_books
for each row execute function public.set_updated_at();

alter table public.admission_books enable row level security;

create policy "admission_books_admin_all" on public.admission_books
for all using (public.is_admin()) with check (public.is_admin());
