-- Add repayment frequency for non-personal loans

alter table public.loans
add column if not exists repayment_frequency text not null default 'weekly';

-- Optional index for filtering/reporting
create index if not exists idx_loans_repayment_frequency on public.loans (repayment_frequency);
