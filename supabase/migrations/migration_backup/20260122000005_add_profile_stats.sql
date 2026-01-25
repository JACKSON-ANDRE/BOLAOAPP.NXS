-- ADD PROFILE STATS COLUMNS
-- Purpose: Fix "column total_won does not exist" error in finish_pool RPC.

DO $$
BEGIN
    -- 1. Add total_won if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_won') THEN
        ALTER TABLE profiles ADD COLUMN total_won numeric DEFAULT 0;
    END IF;

    -- 2. Add win_count if missing (implied usage in RPC)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'win_count') THEN
        ALTER TABLE profiles ADD COLUMN win_count int DEFAULT 0;
    END IF;

END $$;
