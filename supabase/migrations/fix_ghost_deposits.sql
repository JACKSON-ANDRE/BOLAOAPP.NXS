-- 🩹 FIX GHOST DEPOSITS (Retroactive Fix)
-- This script finds deposits that were approved but missed the balance credit.
-- It will credit the balance and create the missing transaction record.

DO $$
DECLARE
    r RECORD;
    v_count INT := 0;
BEGIN
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
        -- 1. Credit Balance
        UPDATE public.profiles
        SET balance = balance + r.amount
        WHERE id = r.user_id;

        -- 2. Create Transaction Log (Backdated to when it was approved)
        INSERT INTO public.transactions (
            user_id, 
            amount, 
            type, 
            status, 
            reference_id, 
            created_by, -- System fix
            balance_type, 
            created_at
        )
        VALUES (
            r.user_id,
            r.amount,
            'deposit',
            'approved',
            r.id,
            null, -- System
            'balance',
            r.updated_at -- Keep original approval time
        );

        v_count := v_count + 1;
    END LOOP;

    RAISE NOTICE 'Fixed % ghost deposits.', v_count;
END $$;
