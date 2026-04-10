-- Member document attachments (client documents)

create table if not exists public.member_documents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  loan_id uuid references public.loans(id) on delete set null,
  document_type text,
  notes text,
  file_name text not null,
  file_path text not null,
  file_size integer,
  mime_type text,
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists member_documents_member_id_idx
  on public.member_documents(member_id);/*  */

create index if not exists member_documents_loan_id_idx
  on public.member_documents(loan_id);

alter table public.member_documents enable row level security;

create policy "member_documents_select_admin_manager"
  on public.member_documents
  for select using (public.is_admin_or_manager());

create policy "member_documents_insert_admin_manager"
  on public.member_documents
  for insert with check (public.is_admin_or_manager());

create policy "member_documents_update_admin_manager"
  on public.member_documents
  for update using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

create policy "member_documents_delete_admin_only"
  on public.member_documents
  for delete using (public.is_admin());

-- Storage bucket for member documents
insert into storage.buckets (id, name, public)
values ('member-documents', 'member-documents', false)
on conflict (id) do nothing;

create policy "member_docs_storage_select"
  on storage.objects
  for select using (
    bucket_id = 'member-documents' and public.is_admin_or_manager()
  );

create policy "member_docs_storage_insert"
  on storage.objects
  for insert with check (
    bucket_id = 'member-documents' and public.is_admin_or_manager()
  );

create policy "member_docs_storage_update"
  on storage.objects
  for update using (
    bucket_id = 'member-documents' and public.is_admin_or_manager()
  ) with check (
    bucket_id = 'member-documents' and public.is_admin_or_manager()
  );

create policy "member_docs_storage_delete_admin_only"
  on storage.objects
  for delete using (
    bucket_id = 'member-documents' and public.is_admin()
  );
