-- FIX MATCHING LOGIC & ALLOW RE-CALCULATION
-- Purpose: 
-- 1. Make matching case-insensitive and whitespace-insensitive.
-- 2. Allow re-running finish_pool ONLY IF 0 winners were found previously (Safety).

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
    SELECT * INTO v_pool FROM public.pools WHERE id = p_pool_id FOR UPDATE; 
    
    -- Allow retry if net_prize > 0 but is_distributed is false or winners_count was 0?
    -- Simplest check: If status is finished, verify if we can re-run.
    IF v_pool.status = 'finished' THEN
        -- Allow re-run if previously 0 winners (nobody got paid)
        IF EXISTS (SELECT 1 FROM public.bets WHERE pool_id = p_pool_id AND status = 'won') THEN
             RAISE EXCEPTION 'Bolão já foi finalizado e prêmios entregues. Não é possível alterar.'; 
        END IF;
        -- Else, proceed (it was a failed finish or 0 winners)
    END IF;

    IF v_pool.status <> 'open' AND v_pool.status <> 'finished' THEN 
        RAISE EXCEPTION 'Status inválido.'; 
    END IF;

    -- Calc values
    SELECT COALESCE(SUM(amount), 0) INTO v_gross FROM public.bets WHERE pool_id = p_pool_id;
    IF v_gross > 0 THEN v_fee := v_gross * 0.10; ELSE v_fee := 0; END IF;
    v_net := v_gross - v_fee;
    IF v_net < 0 THEN v_net := 0; END IF;

    -- ROBUST MATCHING: Use TRIM + LOWER
    SELECT COUNT(*) INTO v_winners_count 
    FROM public.bets 
    WHERE pool_id = p_pool_id 
    AND LOWER(TRIM(selected_option)) = LOWER(TRIM(p_winning_option));

    IF v_winners_count > 0 THEN
        v_prize_share := v_net / v_winners_count;
        
        -- Loop matches
        FOR v_bet IN 
            SELECT * FROM public.bets 
            WHERE pool_id = p_pool_id 
            AND LOWER(TRIM(selected_option)) = LOWER(TRIM(p_winning_option)) 
        LOOP
            
            -- Only pay if not already won (idempotency for re-runs)
            IF v_bet.status <> 'won' THEN
                 UPDATE public.profiles 
                 SET total_won = COALESCE(total_won, 0) + v_prize_share,
                     win_count = COALESCE(win_count, 0) + 1
                 WHERE id = v_bet.user_id;

                 INSERT INTO public.transactions (user_id, amount, type, status, reference_id, balance_type, created_by)
                 VALUES (v_bet.user_id, v_prize_share, 'winning', 'approved', p_pool_id, 'withdrawable', p_admin_id);
                 
                 INSERT INTO public.user_notifications (user_id, title, message, type)
                 VALUES (v_bet.user_id, 'VITÓRIA! 🏆', format('Parabéns! Você ganhou R$ %s no bolão "%s".', to_char(v_prize_share, 'FM999G999D00'), v_pool.title), 'success');

                 UPDATE public.bets SET status = 'won' WHERE id = v_bet.id;
            END IF;
        END LOOP;
        
        -- Mark losers
        UPDATE public.bets 
        SET status = 'lost' 
        WHERE pool_id = p_pool_id 
        AND LOWER(TRIM(selected_option)) <> LOWER(TRIM(p_winning_option));
        
    ELSE
         -- No winners found
         UPDATE public.bets SET status = 'lost' WHERE pool_id = p_pool_id;
    END IF;

    UPDATE public.pools SET status = 'finished', winning_option = p_winning_option, gross_amount = v_gross, service_fee = v_fee, net_prize = v_net, is_distributed = true WHERE id = p_pool_id;
END;
$$;
