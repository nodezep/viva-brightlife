-- Add Partial Payment and Transaction Tracking
ALTER TABLE loan_schedules 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TABLE IF NOT EXISTS loan_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES loan_schedules(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL,
    transaction_date DATE DEFAULT CURRENT_DATE,
    type VARCHAR(50) NOT NULL, -- 'payment', 'reversal', 'interest_accrual'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE loan_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access" ON loan_transactions 
FOR ALL TO authenticated USING (true) WITH CHECK (true);
