-- SECURE PAYOUT LOGIC
-- Purpose: Prevent double payments and race conditions using FOR UPDATE and strict state checks.

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
    -- 1. LOCK the pool row to prevent concurrent executions
    SELECT * INTO v_pool 
    FROM public.pools 
    WHERE id = p_pool_id 
    FOR UPDATE; -- This waits if another transaction is already processing this pool

    -- 2. Validate State AFTER lock
    IF v_pool.status <> 'open' THEN 
        RAISE EXCEPTION 'Bolão já foi encerrado por outra solicitação.'; 
    END IF;

    -- 3. Validate Permissions
    IF v_pool.creator_id <> p_admin_id AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Sem permissão.';
    END IF;

    -- 4. Calculate Values
    SELECT COALESCE(SUM(amount), 0) INTO v_gross FROM public.bets WHERE pool_id = p_pool_id;
    
    IF v_gross > 0 THEN v_fee := v_gross * 0.10; ELSE v_fee := 0; END IF;
    v_net := v_gross - v_fee;
    IF v_net < 0 THEN v_net := 0; END IF;

    SELECT COUNT(*) INTO v_winners_count FROM public.bets WHERE pool_id = p_pool_id AND selected_option = p_winning_option;

    -- 5. Process Winners
    IF v_winners_count > 0 THEN
        v_prize_share := v_net / v_winners_count;
        
        FOR v_bet IN 
            SELECT * FROM public.bets 
            WHERE pool_id = p_pool_id AND selected_option = p_winning_option 
            -- Optional: Add 'FOR UPDATE' here if we were modifying bets heavily, but status update is enough
        LOOP
            -- Double check: only pay if bet is strictly 'pending' or 'open' (though status usually isn't set yet)
            -- We assume bets are valid.
            
            -- Update User Balance (Atomic increment)
            UPDATE public.profiles 
            SET withdrawable_balance = withdrawable_balance + v_prize_share,
                total_won = COALESCE(total_won, 0) + v_prize_share,
                win_count = COALESCE(win_count, 0) + 1
            WHERE id = v_bet.user_id;

            -- Create Transaction Log (Idempotency check could be added here but Pool Lock prevents it)
            INSERT INTO public.transactions (user_id, amount, type, status, reference_id, balance_type, created_by)
            VALUES (v_bet.user_id, v_prize_share, 'winning', 'approved', p_pool_id, 'withdrawable', p_admin_id);
            
            -- Send Notification
            INSERT INTO public.user_notifications (user_id, title, message, type)
            VALUES (
                v_bet.user_id,
                'VITÓRIA! 🏆',
                format('Parabéns! Você ganhou R$ %s no bolão "%s". O valor já está no seu Saldo para Saque.', to_char(v_prize_share, 'FM999G999D00'), v_pool.title),
                'success'
            );

            -- Mark Bet as Won
            UPDATE public.bets SET status = 'won' WHERE id = v_bet.id;
        END LOOP;
        
        -- 6. Process Losers
        FOR v_bet IN SELECT * FROM public.bets WHERE pool_id = p_pool_id AND selected_option <> p_winning_option LOOP
             UPDATE public.bets SET status = 'lost' WHERE id = v_bet.id;
             
             INSERT INTO public.user_notifications (user_id, title, message, type)
             VALUES (
                v_bet.user_id, 
                'Resultado do Bolão', 
                format('O bolão "%s" foi finalizado. Vencedor: %s.', v_pool.title, p_winning_option), 
                'info'
             );
        END LOOP;
        
    ELSE
        -- No winners (House takes all? Or just mark all lost? Logic says mark lost, money stays in 'net_prize' on pool record for audit)
        UPDATE public.bets SET status = 'lost' WHERE pool_id = p_pool_id;
    END IF;

    -- 7. Finalize Pool State
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
