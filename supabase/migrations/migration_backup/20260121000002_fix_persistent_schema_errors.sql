
-- COMPREHENSIVE FIX for Missing Columns
-- Run this script to ensure all potential missing columns exist

DO $$
BEGIN
    -- 1. Fix 'transactions' table: Ensure 'status' column exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'status') THEN
            ALTER TABLE transactions ADD COLUMN status text DEFAULT 'pending';
        END IF;
    END IF;

    -- 2. Fix 'user_balances' table: Ensure BOTH 'updated' and 'updated_at' exist
    -- This covers the discrepancy in error messages (one said 'updated', the other 'updated_at')
    -- We assume 'user_balances' might be a legacy table used by hidden triggers.
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_balances') THEN
        
        -- Add 'updated' if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_balances' AND column_name = 'updated') THEN
            ALTER TABLE user_balances ADD COLUMN updated timestamp with time zone DEFAULT now();
        END IF;

        -- Add 'updated_at' if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_balances' AND column_name = 'updated_at') THEN
            ALTER TABLE user_balances ADD COLUMN updated_at timestamp with time zone DEFAULT now();
        END IF;

    ELSE
        -- If the table doesn't exist but triggers try to write to it, we might need to recreate it
        -- But for now, we assume the table exists because the error said "column ... of relation ... does not exist"
        -- implying the relation (table) exists.
        RAISE NOTICE 'Table user_balances does not exist, skipping column checks.';
    END IF;

END $$;
