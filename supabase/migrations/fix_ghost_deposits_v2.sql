-- 🩹 FIX GHOST DEPOSITS v2 (With Valid Admin ID)
-- The previous attempt failed because 'created_by' cannot be NULL.
-- We will fetch the first available Admin to use as the 'creator' of these recovery records.

DO $$
DECLARE
    r RECORD;
    v_admin_id uuid;
    v_count INT := 0;
BEGIN
    -- 1. Get a valid Admin ID (Any admin will do for system fix)
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'No admin found to attribute these transactions to.';
    END IF;

    FOR r IN 
        SELECT d.id, d.user_id, d.amount, d.updated_at
        FROM public.deposit_requests d
        WHERE d.status = 'approved'
        AND NOT EXISTS (
            SELECT 1 FROM public.transactions t 
            WHERE t.reference_id = d.id 
            AND t.type = 'deposit'
        )
    LOOP
        -- 2. Credit Balance
        UPDATE public.profiles
        SET balance = balance + r.amount
        WHERE id = r.user_id;

        -- 3. Create Transaction Log (Backdated) with VALID Admin ID
        INSERT INTO public.transactions (
            user_id, 
            amount, 
            type, 
            status, 
            reference_id, 
            created_by, -- Now using a real Admin ID
            balance_type, 
            created_at
        )
        VALUES (
            r.user_id,
            r.amount,
            'deposit',
            'approved',
            r.id,
            v_admin_id, 
            'balance',
            r.updated_at
        );

        v_count := v_count + 1;
    END LOOP;

    RAISE NOTICE 'Fixed % ghost deposits using Admin ID: %', v_count, v_admin_id;
END $$;
