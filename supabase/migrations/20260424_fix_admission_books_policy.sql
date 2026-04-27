-- Update admission_books policy to allow all authenticated users to read and insert/update.
-- This allows Credit Officers and Managers to see and approve admission books.

drop policy if exists "admission_books_admin_all" on public.admission_books;

create policy "admission_books_all_authenticated" on public.admission_books
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
