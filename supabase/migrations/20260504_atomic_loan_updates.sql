-- Function to update loan balances atomically to prevent race conditions
CREATE OR REPLACE FUNCTION record_loan_payment(
  p_loan_id UUID,
  p_delta NUMERIC
) RETURNS VOID AS $$
BEGIN
  UPDATE loans
  SET 
    outstanding_balance = ROUND(GREATEST(0, outstanding_balance - p_delta)::numeric, 2),
    amount_withdrawn = ROUND((amount_withdrawn + p_delta)::numeric, 2),
    status = CASE 
      -- Auto-close if balance reaches zero or below
      WHEN (outstanding_balance - p_delta) <= 0 THEN 'closed'
      -- Re-open if balance becomes positive again (e.g. reversal)
      WHEN status = 'closed' AND (outstanding_balance - p_delta) > 0 THEN 'active'
      ELSE status
    END
  WHERE id = p_loan_id;
END;
$$ LANGUAGE plpgsql;

-- Function to adjust loan balance and terms (interest addition / duration extension)
CREATE OR REPLACE FUNCTION adjust_loan_balance_and_terms(
  p_loan_id UUID,
  p_interest_delta NUMERIC,
  p_cycle_delta INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE loans
  SET 
    security_amount = security_amount + p_interest_delta,
    outstanding_balance = outstanding_balance + p_interest_delta,
    cycle_count = cycle_count + p_cycle_delta,
    duration_months = COALESCE(duration_months, 0) + p_cycle_delta
  WHERE id = p_loan_id;
END;
$$ LANGUAGE plpgsql;
