-- FIX FINISH POOL RPC - TRANSACTION BALANCE_TYPE and CREATED_BY
-- Purpose: Fix "null value in column balance_type" AND "violates check constraint transactions_created_by_check".

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
    
    IF v_pool.status <> 'open' THEN
        RAISE EXCEPTION 'Bolão já encerrado ou cancelado.';
    END IF;

    -- 2. Verify Permission (Organizer or Admin)
    IF v_pool.creator_id <> p_admin_id AND 
       NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Sem permissão para encerrar este bolão.';
    END IF;

    -- 3. Calculate Totals FROM BETS (Source of Truth)
    SELECT COALESCE(SUM(amount), 0) INTO v_gross 
    FROM public.bets 
    WHERE pool_id = p_pool_id;

    -- 4. Calculate Fee (Tiered Logic: 5.00 for every 50.00 bracket)
    IF v_gross > 0 THEN
        v_fee := CEIL(v_gross / 50.0) * 5.0;
    ELSE
        v_fee := 0;
    END IF;

    v_net := v_gross - v_fee;

    IF v_net < 0 THEN v_net := 0; END IF;

    -- 5. Check Winners
    SELECT COUNT(*) INTO v_winners_count
    FROM public.bets
    WHERE pool_id = p_pool_id AND selected_option = p_winning_option;

    -- 6. Distribute
    IF v_winners_count > 0 THEN
        v_prize_share := v_net / v_winners_count;
        
        -- Loop winners
        FOR v_bet IN 
            SELECT * FROM public.bets 
            WHERE pool_id = p_pool_id AND selected_option = p_winning_option
        LOOP
            -- Credit User (Update balance and stats)
            UPDATE public.profiles 
            SET balance = balance + v_prize_share,
                total_won = COALESCE(total_won, 0) + v_prize_share,
                win_count = COALESCE(win_count, 0) + 1
            WHERE id = v_bet.user_id;

            -- Log Transaction with BALANCE_TYPE and CREATED_BY
            INSERT INTO public.transactions (
                user_id, 
                amount, 
                type, 
                status, 
                reference_id, 
                balance_type, 
                created_by -- <--- ADDED THIS
            )
            VALUES (
                v_bet.user_id, 
                v_prize_share, 
                'winning', 
                'approved', 
                p_pool_id, 
                'balance', 
                p_admin_id -- <--- ADDED THIS
            );
            
            -- Update Bet Status
            UPDATE public.bets SET status = 'won' WHERE id = v_bet.id;
        END LOOP;
        
        -- Mark losers
        UPDATE public.bets SET status = 'lost' 
        WHERE pool_id = p_pool_id AND selected_option <> p_winning_option;
        
    ELSE
        -- No winners
        UPDATE public.bets SET status = 'lost' WHERE pool_id = p_pool_id;
    END IF;

    -- 7. Update Pool
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
