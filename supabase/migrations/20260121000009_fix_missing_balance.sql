
-- FIX MISSING BALANCE COLUMN
-- The error "column balance does not exist" confirms 'profiles' table is missing this column.
-- The RPC works, but the TRIGGER fails when trying to update the balance.

DO $$
BEGIN
    -- Check if 'balance' exists in 'profiles', if not, add it.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'balance') THEN
        ALTER TABLE profiles ADD COLUMN balance numeric DEFAULT 0;
    END IF;
END $$;
