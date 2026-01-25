
-- ENSURE COMPLETE SCHEMA (FINAL FIX)
-- This script fixes the "message_id not null" error and ensures all columns exist.

DO $$
BEGIN
    ----------------------------------------------------------------
    -- 1. USER_NOTIFICATIONS (Fixing the Error)
    ----------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_notifications') THEN
        -- Add 'message' column for custom text
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'message') THEN
            ALTER TABLE user_notifications ADD COLUMN message text;
        END IF;

        -- CRITICAL FIX: Make 'message_id' nullable (it was causing the error)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'message_id') THEN
            ALTER TABLE user_notifications ALTER COLUMN message_id DROP NOT NULL;
        END IF;

        -- Check for 'admin_message_id' just in case and fix it too
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'admin_message_id') THEN
            ALTER TABLE user_notifications ALTER COLUMN admin_message_id DROP NOT NULL;
        END IF;
    END IF;

    ----------------------------------------------------------------
    -- 2. DEPOSIT_REQUESTS
    ----------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deposit_requests') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deposit_requests' AND column_name = 'updated_at') THEN
            ALTER TABLE deposit_requests ADD COLUMN updated_at timestamp with time zone DEFAULT now();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deposit_requests' AND column_name = 'proof_url') THEN
            ALTER TABLE deposit_requests ADD COLUMN proof_url text;
        END IF;
    END IF;

    ----------------------------------------------------------------
    -- 3. TRANSACTIONS
    ----------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'status') THEN
            ALTER TABLE transactions ADD COLUMN status text DEFAULT 'approved';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'created_by') THEN
            ALTER TABLE transactions ADD COLUMN created_by uuid REFERENCES auth.users(id);
        ELSE
            ALTER TABLE transactions ALTER COLUMN created_by DROP NOT NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'reference_id') THEN
            ALTER TABLE transactions ADD COLUMN reference_id text; 
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'proof_url') THEN
            ALTER TABLE transactions ADD COLUMN proof_url text;
        END IF;
    END IF;

    ----------------------------------------------------------------
    -- 4. PROFILES
    ----------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'pix_key') THEN
            ALTER TABLE profiles ADD COLUMN pix_key text;
        END IF;
    END IF;

    ----------------------------------------------------------------
    -- 5. USER_BALANCES (View Fix)
    ----------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_balances' AND table_type = 'BASE TABLE') THEN
         IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_balances' AND column_name = 'updated') THEN
            ALTER TABLE user_balances ADD COLUMN updated timestamp with time zone DEFAULT now();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_balances' AND column_name = 'updated_at') THEN
            ALTER TABLE user_balances ADD COLUMN updated_at timestamp with time zone DEFAULT now();
        END IF;
    END IF;

END $$;
