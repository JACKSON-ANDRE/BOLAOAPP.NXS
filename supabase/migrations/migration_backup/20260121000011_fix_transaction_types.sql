
-- FIX TRANSACTION TYPES CONSTRAINT
-- The error "violates check constraint transactions_type_check" confirms 'withdrawal' is missing.
-- We will update the constraint to allow 'withdrawal'.

DO $$
BEGIN
    -- 1. Drop the restrictive constraint
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_type_check') THEN
        ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;
    END IF;

    -- 2. Add the updated constraint including 'withdrawal'
    -- preserving existing types 'deposit', 'bet', 'refund'
    ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
    CHECK (type IN ('deposit', 'bet', 'refund', 'withdrawal', 'withdraw', 'winning', 'bonus'));

END $$;
