-- 🚨 FIX POOL PAYOUT: 10% FEE & WITHDRAWABLE CREDIT 🚨
-- Update finish_pool to match exactly the user requirements.

CREATE OR REPLACE FUNCTION public.finish_pool(
    p_pool_id uuid,
    p_winning_option text,
    p_admin_id uuid
)
RETURNS json
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
    -- 1. Lock the pool to prevent concurrent finish calls
    SELECT * INTO v_pool FROM public.pools WHERE id = p_pool_id FOR UPDATE;
    
    IF v_pool IS NULL THEN 
        RETURN json_build_object('success', false, 'message', 'Bolão não encontrado.');
    END IF;
    
    IF v_pool.status <> 'open' AND v_pool.status <> 'closed' THEN 
        RETURN json_build_object('success', false, 'message', 'Este bolão já foi finalizado ou não está aberto/fechado.');
    END IF;
    
    IF v_pool.is_distributed THEN 
        RETURN json_build_object('success', false, 'message', 'Este bolão já teve os prêmios distribuídos.');
    END IF;

    -- 2. Calculate Gross (Total bets)
    SELECT COALESCE(SUM(amount), 0) INTO v_gross FROM public.bets WHERE pool_id = p_pool_id;
    
    -- 3. Calculate Fee (Exactly 10% as per user request)
    v_fee := TRUNC(v_gross * 0.10, 2);
    v_net := v_gross - v_fee;
    IF v_net < 0 THEN v_net := 0; END IF;

    -- 4. Count Winners
    SELECT COUNT(*) INTO v_winners_count FROM public.bets 
    WHERE pool_id = p_pool_id AND selected_option = p_winning_option;

    -- 5. Distribute Prizes
    IF v_winners_count > 0 THEN
        v_prize_share := TRUNC(v_net / v_winners_count, 2);
        
        FOR v_bet IN SELECT * FROM public.bets WHERE pool_id = p_pool_id AND selected_option = p_winning_option LOOP
            -- CREDIT WITHDRAWABLE BALANCE (Saldo Saque)
            UPDATE public.profiles SET 
                withdrawable_balance = COALESCE(withdrawable_balance, 0) + v_prize_share,
                total_won = COALESCE(total_won, 0) + v_prize_share,
                win_count = COALESCE(win_count, 0) + 1
            WHERE id = v_bet.user_id;

            -- Transaction (withdrawable)
            INSERT INTO public.transactions (
                user_id, amount, type, status, reference_id, created_by, balance_type, description
            )
            VALUES (
                v_bet.user_id, v_prize_share, 'winning', 'approved', p_pool_id, p_admin_id, 'withdrawable', 'Prêmio do Bolão: ' || v_pool.title
            );
            
            UPDATE public.bets SET status = 'won' WHERE id = v_bet.id;

            -- Notify Winner
            INSERT INTO public.user_notifications (user_id, message)
            VALUES (v_bet.user_id, '🎉 PARABÉNS! Você ganhou R$ ' || v_prize_share || ' no bolão "' || v_pool.title || '"!');
        END LOOP;
        
        -- Mark others as lost
        UPDATE public.bets SET status = 'lost' WHERE pool_id = p_pool_id AND selected_option <> p_winning_option;
        
        -- Bulk notify losers
        INSERT INTO public.user_notifications (user_id, message)
        SELECT DISTINCT user_id, '❌ O bolão "' || v_pool.title || '" encerrou. Resultado: ' || p_winning_option
        FROM public.bets WHERE pool_id = p_pool_id AND selected_option <> p_winning_option;
    ELSE
        -- No winners
        UPDATE public.bets SET status = 'lost' WHERE pool_id = p_pool_id;
    END IF;

    -- 6. Update Pool Status
    UPDATE public.pools SET 
        status = 'finished', 
        winning_option = p_winning_option, 
        gross_amount = v_gross, 
        service_fee = v_fee, 
        net_prize = v_net, 
        is_distributed = true 
    WHERE id = p_pool_id;

    RETURN json_build_object('success', true, 'net_prize', v_net, 'winners', v_winners_count);
END;
$$;
