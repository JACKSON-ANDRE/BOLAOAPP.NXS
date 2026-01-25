-- FIX FINISH POOL RPC
-- Fixes: "null value in column 'balance_type'" error
-- Changes: Explicitly inserts 'withdrawable' into transactions table

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
    v_prize_share numeric := 0;
    v_winners_count int := 0;
    v_bet record;
BEGIN
    SELECT * INTO v_pool FROM public.pools WHERE id = p_pool_id;
    
    IF v_pool.status <> 'open' THEN RAISE EXCEPTION 'Bolão já encerrado.'; END IF;

    -- Calc values
    SELECT COALESCE(SUM(amount), 0) INTO v_gross FROM public.bets WHERE pool_id = p_pool_id;
    
    IF v_gross > 0 THEN v_fee := CEIL(v_gross / 50.0) * 5.0; END IF;
    v_net := v_gross - v_fee;
    IF v_net < 0 THEN v_net := 0; END IF;

    -- Winners
    SELECT COUNT(*) INTO v_winners_count FROM public.bets 
    WHERE pool_id = p_pool_id AND selected_option = p_winning_option;

    IF v_winners_count > 0 THEN
        v_prize_share := TRUNC(v_net / v_winners_count, 2);
        
        FOR v_bet IN SELECT * FROM public.bets WHERE pool_id = p_pool_id AND selected_option = p_winning_option LOOP
            -- Update Winner
            UPDATE public.profiles SET 
                balance = balance + v_prize_share,
                total_won = COALESCE(total_won,0) + v_prize_share,
                win_count = COALESCE(win_count,0) + 1,
                withdrawable_balance = COALESCE(withdrawable_balance, 0) + v_prize_share
            WHERE id = v_bet.user_id;

            -- Transaçao (FIXED: Added balance_type)
            INSERT INTO public.transactions (user_id, amount, type, status, reference_id, created_by, balance_type)
            VALUES (v_bet.user_id, v_prize_share, 'winning', 'approved', p_pool_id, p_admin_id, 'withdrawable');
            
            UPDATE public.bets SET status = 'won' WHERE id = v_bet.id;

            -- Notify
            INSERT INTO public.user_notifications (user_id, message, created_at)
            VALUES (v_bet.user_id, '🎉 PARABÉNS! Você ganhou R$ ' || v_prize_share || ' no bolão "' || v_pool.title || '"!', now());
        END LOOP;
        
        -- Losers
        UPDATE public.bets SET status = 'lost' WHERE pool_id = p_pool_id AND selected_option <> p_winning_option;
        
        INSERT INTO public.user_notifications (user_id, message, created_at)
        SELECT user_id, '❌ O bolão "' || v_pool.title || '" encerrou. Resultado: ' || p_winning_option, now()
        FROM public.bets WHERE pool_id = p_pool_id AND selected_option <> p_winning_option;
    ELSE
        -- Reimburse or House keeps? Usually house keeps if no winners, or refund. 
        -- For simplicity here: House keeps (status finished), users lose.
        UPDATE public.bets SET status = 'lost' WHERE pool_id = p_pool_id;
    END IF;

    UPDATE public.pools SET 
        status = 'finished', winning_option = p_winning_option, 
        gross_amount = v_gross, service_fee = v_fee, net_prize = v_net, is_distributed = true 
    WHERE id = p_pool_id;
END;
$$;
