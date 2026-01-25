-- DIAGNOSE ADMIN BALANCE
-- Fetch Admin Profile and Transaction History breakdown

DO $$
DECLARE
    v_admin_id uuid;
    r_profile record;
BEGIN
    -- 1. Find the Admin
    SELECT * INTO r_profile FROM public.profiles WHERE role = 'admin' LIMIT 1;
    v_admin_id := r_profile.id;

    RAISE NOTICE '--- ADMIN DIAGNOSIS ---';
    RAISE NOTICE 'Admin: % (%)', r_profile.full_name, r_profile.email;
    RAISE NOTICE 'Current State: Balance (Jogo)=%, Withdrawable (Saque)=%', r_profile.balance, r_profile.withdrawable_balance;

    -- 2. Breakdown by Type (What built this balance?)
    RAISE NOTICE '--- TRANSACTION SUMMARY ---';
    FOR r_profile IN 
        SELECT type, status, COUNT(*) as count, SUM(amount) as total
        FROM public.transactions
        WHERE user_id = v_admin_id
        GROUP BY type, status
    LOOP
        RAISE NOTICE 'Type: % | Status: % | Count: % | Total: %', r_profile.type, r_profile.status, r_profile.count, r_profile.total;
    END LOOP;

    -- 3. Check for specific large entries
    RAISE NOTICE '--- RECENT TRANSACTIONS (Top 10) ---';
    FOR r_profile IN 
        SELECT type, amount, created_at, balance_type
        FROM public.transactions
        WHERE user_id = v_admin_id
        ORDER BY created_at DESC
        LIMIT 10
    LOOP
        RAISE NOTICE '[%] % R$ % (Bucket: %)', r_profile.created_at, r_profile.type, r_profile.amount, r_profile.balance_type;
    END LOOP;

END $$;
