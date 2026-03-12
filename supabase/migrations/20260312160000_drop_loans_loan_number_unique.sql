-- Allow duplicate loan_number values (loan numbers are per-person)
alter table public.loans
drop constraint if exists loans_loan_number_key;
