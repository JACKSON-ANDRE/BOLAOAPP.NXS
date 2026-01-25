-- FIX POOLS CREATOR_ID FK
-- Problem: pools.creator_id references auth.users, but we want to join with public.profiles.
-- Solution: Change FK to reference public.profiles(id).

DO $$
BEGIN
    -- 1. Try to drop the existing constraint (name might vary, so we try generic names or ignore error)
    -- Default name for pools.creator_id -> auth.users is likely pools_creator_id_fkey
    -- We drop it if it exists.
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pools_creator_id_fkey') THEN
        ALTER TABLE pools DROP CONSTRAINT pools_creator_id_fkey;
    END IF;

    -- Also check for auto-generated name if mismatched
    -- (We can't easily guess random names, but let's assume standard naming or just add the new one)

    -- 2. Add the correct FK referencing profiles
    ALTER TABLE pools
    ADD CONSTRAINT pools_creator_id_fkey
    FOREIGN KEY (creator_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE; -- If profile is deleted, delete pool? Or Set Null? Cascade is risky but consistent.

END $$;
