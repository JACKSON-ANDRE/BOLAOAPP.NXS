-- MASTER FIX: DOUBLE PAYMENTS & DEDUCTIONS
-- Purpose: 
-- 1. Drop existing functions to ensure clean slate.
-- 2. Re-create 'place_bet' and 'finish_pool' WITHOUT manual balance updates (relying on triggers).
-- 3. Ensure Trigger is single and correct.

-- A. DROP FUNCTIONS TO FORCE UPDATE
DROP FUNCTION IF EXISTS public.place_bet(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.finish_pool(uuid, text, uuid);

-- B. RE-CREATE 'place_bet' (Trigger-based)
CREATE OR REPLACE FUNCTION public.place_bet(
    p_pool_id uuid,
    p_user_id uuid,
    p_selected_option text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pool record;
    v_profile record;
    v_bet_id uuid;
BEGIN
    SELECT * INTO v_pool FROM public.pools WHERE id = p_pool_id;
    IF v_pool IS NULL THEN RAISE EXCEPTION 'Bolão não encontrado.'; END IF;
    IF v_pool.status <> 'open' THEN RAISE EXCEPTION 'Bolão fechado.'; END IF;
    IF v_pool.bets_deadline IS NOT NULL AND NOW() > v_pool.bets_deadline THEN RAISE EXCEPTION 'Prazo encerrado.'; END IF;

    -- Lock Profile
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE; 

    IF v_profile.balance < v_pool.entry_fee THEN RAISE EXCEPTION 'Saldo insuficiente.'; END IF;
    IF EXISTS (SELECT 1 FROM public.bets WHERE pool_id = p_pool_id AND user_id = p_user_id) THEN 
        RAISE EXCEPTION 'Aposta já realizada.'; 
    END IF;

    -- [CORRECTION]: NO MANUAL BALANCE UPDATE HERE. 
    -- We let the INSERT into transactions trigger the balance update.
    
    INSERT INTO public.bets (pool_id, user_id, amount, selected_option, status)
    VALUES (p_pool_id, p_user_id, v_pool.entry_fee, p_selected_option, 'pending')
    RETURNING id INTO v_bet_id;

    -- Trigger 'on_transaction_created' will deduct balance
    INSERT INTO public.transactions (user_id, amount, type, status, reference_id, balance_type, created_by)
    VALUES (p_user_id, v_pool.entry_fee, 'bet_debit', 'approved', p_pool_id, 'balance', p_user_id);

    RETURN json_build_object('success', true);
END;
$$;

-- C. RE-CREATE 'finish_pool' (Trigger-based)
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
    
    IF v_pool.status <> 'open' THEN RAISE EXCEPTION 'Bolão já encerrado.'; END IF;
    IF v_pool.creator_id <> p_admin_id AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Sem permissão.';
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_gross FROM public.bets WHERE pool_id = p_pool_id;
    IF v_gross > 0 THEN v_fee := v_gross * 0.10; ELSE v_fee := 0; END IF;
    v_net := v_gross - v_fee;
    IF v_net < 0 THEN v_net := 0; END IF;

    SELECT COUNT(*) INTO v_winners_count FROM public.bets WHERE pool_id = p_pool_id AND selected_option = p_winning_option;

    IF v_winners_count > 0 THEN
        v_prize_share := v_net / v_winners_count;
        FOR v_bet IN SELECT * FROM public.bets WHERE pool_id = p_pool_id AND selected_option = p_winning_option LOOP
            
            -- [CORRECTION]: NO MANUAL BALANCE UPDATE HERE.
            -- Only update stats. Trigger 'on_transaction_created' handles the money.
            UPDATE public.profiles 
            SET total_won = COALESCE(total_won, 0) + v_prize_share,
                win_count = COALESCE(win_count, 0) + 1
            WHERE id = v_bet.user_id;

            -- Trigger adds funds to withdrawable_balance
            INSERT INTO public.transactions (user_id, amount, type, status, reference_id, balance_type, created_by)
            VALUES (v_bet.user_id, v_prize_share, 'winning', 'approved', p_pool_id, 'withdrawable', p_admin_id);
            
            INSERT INTO public.user_notifications (user_id, title, message, type)
            VALUES (v_bet.user_id, 'VITÓRIA! 🏆', format('Parabéns! Você ganhou R$ %s no bolão "%s". O valor já está no seu Saldo para Saque.', to_char(v_prize_share, 'FM999G999D00'), v_pool.title), 'success');

            UPDATE public.bets SET status = 'won' WHERE id = v_bet.id;
        END LOOP;
        
        FOR v_bet IN SELECT * FROM public.bets WHERE pool_id = p_pool_id AND selected_option <> p_winning_option LOOP
             UPDATE public.bets SET status = 'lost' WHERE id = v_bet.id;
             INSERT INTO public.user_notifications (user_id, title, message, type)
             VALUES (v_bet.user_id, 'Resultado do Bolão', format('O bolão "%s" foi finalizado. Vencedor: %s.', v_pool.title, p_winning_option), 'info');
        END LOOP;
    ELSE
         UPDATE public.bets SET status = 'lost' WHERE pool_id = p_pool_id;
    END IF;

    UPDATE public.pools SET status = 'finished', winning_option = p_winning_option, gross_amount = v_gross, service_fee = v_fee, net_prize = v_net, is_distributed = true WHERE id = p_pool_id;
END;
$$;
