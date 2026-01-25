-- 🔄 STRICT BALANCE RECALCULATION 🔄
-- Separates "Playable Balance" and "Withdrawable Balance" completely.
-- Rule:
-- Balance (Jogo) = Deposits - Bets (Debit)
-- Withdrawable (Saque) = Winnings - Withdrawals

DO $$
DECLARE
    r RECORD;
    v_total_deposits numeric;
    v_total_bets numeric;
    
    v_total_winnings numeric;
    v_total_withdrawals numeric; -- Approved withdrawals

    v_calc_play_balance numeric;
    v_calc_with_balance numeric;
BEGIN
    FOR r IN SELECT id, full_name, email FROM public.profiles LOOP
        
        -- 1. PLAYABLE BUCKET (Depósitos - Apostas)
        SELECT COALESCE(SUM(amount), 0) INTO v_total_deposits
        FROM public.transactions
        WHERE user_id = r.id AND type = 'deposit' AND status = 'approved';

        SELECT COALESCE(SUM(amount), 0) INTO v_total_bets
        FROM public.transactions
        WHERE user_id = r.id AND type = 'bet_debit' AND status = 'approved';

        v_calc_play_balance := v_total_deposits - v_total_bets;
        IF v_calc_play_balance < 0 THEN v_calc_play_balance := 0; END IF; -- Safety floor


        -- 2. WITHDRAWABLE BUCKET (Prêmios - Saques)
        SELECT COALESCE(SUM(amount), 0) INTO v_total_winnings
        FROM public.transactions
        WHERE user_id = r.id AND type = 'winning' AND status = 'approved';

        SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawals
        FROM public.transactions
        WHERE user_id = r.id AND type LIKE 'withdraw%' AND status = 'approved';

        v_calc_with_balance := v_total_winnings - v_total_withdrawals;
        IF v_calc_with_balance < 0 THEN v_calc_with_balance := 0; END IF; -- Safety floor

        -- 3. Apply Fix
        UPDATE public.profiles
        SET 
            balance = v_calc_play_balance,
            withdrawable_balance = v_calc_with_balance
        WHERE id = r.id;

        RAISE NOTICE 'Strict Recalc for %: Jogo=% | Saque=%', r.email, v_calc_play_balance, v_calc_with_balance;
        
    END LOOP;
END $$;
