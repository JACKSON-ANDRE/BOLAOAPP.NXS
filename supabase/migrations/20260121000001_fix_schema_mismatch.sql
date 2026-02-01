-- 1. Fix Missing 'status' column in 'transactions' table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'status') THEN
        ALTER TABLE transactions ADD COLUMN status text DEFAULT 'pending';
    END IF;
END $$;

-- 2. Fix Missing 'updated' column in 'user_balances' table
-- This table seems to be used by legacy triggers or code. Adding the column prevents the error.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_balances') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_balances' AND column_name = 'updated') THEN
            ALTER TABLE user_balances ADD COLUMN updated timestamp with time zone DEFAULT now();
        END IF;
    END IF;
END $$;
