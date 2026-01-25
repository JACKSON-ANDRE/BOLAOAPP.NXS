-- 🔄 ULTIMATE BALANCE RECALCULATION 🔄
-- This script recalculates the wallet balance from scratch based on the transaction history.
-- It fixes any inconsistencies caused by missing triggers or failed updates.

DO $$
DECLARE
    r RECORD;
    v_total_deposits numeric;
    v_total_winnings numeric;
    v_total_bets numeric;
    v_total_withdrawals numeric; -- Approved withdrawals
    v_calculated_balance numeric;
    v_calculated_withdrawable numeric;
BEGIN
    FOR r IN SELECT id, full_name, email FROM public.profiles LOOP
        
        -- 1. Sum Deposits (Approved)
        SELECT COALESCE(SUM(amount), 0) INTO v_total_deposits
        FROM public.transactions
        WHERE user_id = r.id AND type = 'deposit' AND status = 'approved';

        -- 2. Sum Winnings
        SELECT COALESCE(SUM(amount), 0) INTO v_total_winnings
        FROM public.transactions
        WHERE user_id = r.id AND type = 'winning' AND status = 'approved';

        -- 3. Sum Bets (Approved)
        SELECT COALESCE(SUM(amount), 0) INTO v_total_bets
        FROM public.transactions
        WHERE user_id = r.id AND type = 'bet_debit' AND status = 'approved';

        -- 4. Sum Withdrawals (Approved)
        SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawals
        FROM public.transactions
        WHERE user_id = r.id AND type LIKE 'withdraw%' AND status = 'approved';

        -- 5. Calculate Final Balances
        v_calculated_balance := (v_total_deposits + v_total_winnings) - (v_total_bets + v_total_withdrawals);
        
        -- Withdrawable is usually just Winnings - Withdrawals (simplified, usually more complex policy)
        -- But for now, let's just Fix the MAIN POCKET (Balance) which is what users see.
        -- We will TRUST the current withdrawable_balance unless it's negative, 
        -- OR we can recalculate it as Winnings - Withdrawals.
        v_calculated_withdrawable := v_total_winnings - v_total_withdrawals;
        IF v_calculated_withdrawable < 0 THEN v_calculated_withdrawable := 0; END IF;

        -- 6. Apply Fix
        UPDATE public.profiles
        SET 
            balance = v_calculated_balance
            -- withdrawable_balance = v_calculated_withdrawable -- Optional: Uncomment to reset withdrawable too
        WHERE id = r.id;

        RAISE NOTICE 'Recalculated for % (%): Balance = %', r.full_name, r.email, v_calculated_balance;
        
    END LOOP;
END $$;
