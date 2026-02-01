-- FIX FINISH POOL RPC - FINAL
-- Purpose:
-- 1. Credit 'withdrawable_balance' instead of 'balance' (Winnings are for withdrawal only).
-- 2. Send Notifications to Winners and Losers.
-- 3. Include previous fixes (transaction FKs, Fee 10%).

CREATE OR REPLACE FUNCTION public.finish_pool(
    p_pool_id uuid,
    p_winning_option text,
    p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pool record;
    v_gross numeric := 0;
    v_fee numeric := 0;
    v_net numeric := 0;
    v_winners_count int := 0;
    v_prize_share numeric := 0;
    v_bet record;
BEGIN
    -- 1. Get Pool
    SELECT * INTO v_pool FROM public.pools WHERE id = p_pool_id;
    IF v_pool.status <> 'open' THEN RAISE EXCEPTION 'Bolão já encerrado ou cancelado.'; END IF;

    -- 2. Verify Permission
    IF v_pool.creator_id <> p_admin_id AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Sem permissão.';
    END IF;

    -- 3. Calculate Totals
    SELECT COALESCE(SUM(amount), 0) INTO v_gross FROM public.bets WHERE pool_id = p_pool_id;
    
    -- Fee: 10%
    IF v_gross > 0 THEN v_fee := v_gross * 0.10; ELSE v_fee := 0; END IF;
    v_net := v_gross - v_fee;
    IF v_net < 0 THEN v_net := 0; END IF;

    -- 4. Check Winners
    SELECT COUNT(*) INTO v_winners_count FROM public.bets WHERE pool_id = p_pool_id AND selected_option = p_winning_option;

    -- 5. Distribute
    IF v_winners_count > 0 THEN
        v_prize_share := v_net / v_winners_count;
        
        FOR v_bet IN SELECT * FROM public.bets WHERE pool_id = p_pool_id AND selected_option = p_winning_option LOOP
            -- A. Credit User (WITHDRAWABLE_BALANCE ONLY per user request)
            UPDATE public.profiles 
            SET withdrawable_balance = withdrawable_balance + v_prize_share,
                total_won = COALESCE(total_won, 0) + v_prize_share,
                win_count = COALESCE(win_count, 0) + 1
            WHERE id = v_bet.user_id;

            -- B. Log Transaction (balance_type = 'withdrawable')
            INSERT INTO public.transactions (user_id, amount, type, status, reference_id, balance_type, created_by)
            VALUES (v_bet.user_id, v_prize_share, 'winning', 'approved', p_pool_id, 'withdrawable', p_admin_id);
            
            -- C. Notify Winner
            INSERT INTO public.user_notifications (user_id, title, message, type)
            VALUES (
                v_bet.user_id,
                'Parabéns! Você venceu! 🏆',
                format('Você acertou o resultado do bolão "%s"! Seu prêmio de R$ %s está disponível para SAQUE.', v_pool.title, v_prize_share),
                'success'
            );

            -- D. Update Bet
            UPDATE public.bets SET status = 'won' WHERE id = v_bet.id;
        END LOOP;
        
        -- Mark losers and Notify
        FOR v_bet IN SELECT * FROM public.bets WHERE pool_id = p_pool_id AND selected_option <> p_winning_option LOOP
             UPDATE public.bets SET status = 'lost' WHERE id = v_bet.id;
             
             INSERT INTO public.user_notifications (user_id, title, message, type)
             VALUES (
                v_bet.user_id,
                'Resultado do Bolão',
                format('O bolão "%s" foi finalizado. Vencedor: %s. Infelizmente não foi dessa vez.', v_pool.title, p_winning_option),
                'info'
             );
        END LOOP;
        
    ELSE
        -- No winners
        UPDATE public.bets SET status = 'lost' WHERE pool_id = p_pool_id;
    END IF;

    -- 6. Update Pool
    UPDATE public.pools
    SET status = 'finished',
        winning_option = p_winning_option,
        gross_amount = v_gross,
        service_fee = v_fee,
        net_prize = v_net,
        is_distributed = true
    WHERE id = p_pool_id;
END;
$$;
