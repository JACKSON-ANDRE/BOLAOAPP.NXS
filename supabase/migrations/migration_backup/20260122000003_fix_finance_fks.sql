-- FIX FINANCE TABLES FKs
-- Problem: deposit_requests.user_id and withdraw_requests.user_id reference auth.users.
-- Solution: Change FKs to reference public.profiles(id) to allow standard PostgREST joins.

DO $$
BEGIN
    ----------------------------------------------------------------
    -- 1. DEPOSIT REQUESTS
    ----------------------------------------------------------------
    -- Try to drop common default names. Only one will likely exist.
    BEGIN
        ALTER TABLE deposit_requests DROP CONSTRAINT IF EXISTS deposit_requests_user_id_fkey;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Add the correct FK
    ALTER TABLE deposit_requests
    ADD CONSTRAINT deposit_requests_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

    ----------------------------------------------------------------
    -- 2. WITHDRAW REQUESTS
    ----------------------------------------------------------------
    BEGIN
        ALTER TABLE withdraw_requests DROP CONSTRAINT IF EXISTS withdraw_requests_user_id_fkey;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Add the correct FK
    ALTER TABLE withdraw_requests
    ADD CONSTRAINT withdraw_requests_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

END $$;
