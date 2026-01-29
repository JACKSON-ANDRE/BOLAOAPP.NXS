-- 🚨 STRICT BALANCE SEPARATION 🚨
-- Rules: 
-- 1. Deposits go to 'balance' (Saldo Jogo).
-- 2. Bets come from 'balance' (Saldo Jogo).
-- 3. Winnings go to 'withdrawable_balance' (Saldo Saque).
-- 4. Withdrawals come from 'withdrawable_balance' (Saldo Saque).

-- A. Update finish_pool to credit Saldo Saque instead of Saldo Jogo
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
    
    v_fee := TRUNC(v_gross * 0.10, 2);
    v_net := v_gross - v_fee;
    IF v_net < 0 THEN v_net := 0; END IF;

    -- Winners
    SELECT COUNT(*) INTO v_winners_count FROM public.bets 
    WHERE pool_id = p_pool_id AND selected_option = p_winning_option;

    IF v_winners_count > 0 THEN
        v_prize_share := TRUNC(v_net / v_winners_count, 2);
        
        FOR v_bet IN SELECT * FROM public.bets WHERE pool_id = p_pool_id AND selected_option = p_winning_option LOOP
            -- Update Winner: Credit WITHDRAWABLE_BALANCE (Saldo Saque)
            UPDATE public.profiles SET 
                withdrawable_balance = withdrawable_balance + v_prize_share, -- <--- CORRECTED
                total_won = COALESCE(total_won, 0) + v_prize_share,
                win_count = COALESCE(win_count, 0) + 1
            WHERE id = v_bet.user_id;

            -- Transaçao (Explicitly withdrawable)
            INSERT INTO public.transactions (
                user_id, 
                amount, 
                type, 
                status, 
                reference_id, 
                created_by,
                balance_type,
                description
            )
            VALUES (
                v_bet.user_id, 
                v_prize_share, 
                'winning', 
                'approved', 
                p_pool_id, 
                p_admin_id,
                'withdrawable',
                'Prêmio do Bolão: ' || v_pool.title
            );
            
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
        UPDATE public.bets SET status = 'lost' WHERE pool_id = p_pool_id;
    END IF;

    UPDATE public.pools SET 
        status = 'finished', winning_option = p_winning_option, 
        gross_amount = v_gross, service_fee = v_fee, net_prize = v_net, is_distributed = true 
    WHERE id = p_pool_id;
END;
$$;

-- B. Ensure place_bet strictly uses 'balance' (Saldo Jogo)
-- This is already the case in reapply_place_bet.sql, but we re-confirm here.
-- No changes needed if it only touches 'balance'.

-- C. Final Audit Trigger for process_deposit_notification
-- This was already fixed in our previous manual script, but ensuring it's in a migration too.
CREATE OR REPLACE FUNCTION public.process_deposit_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name text;
BEGIN
    IF (COALESCE(OLD.status, 'pending') != 'approved' AND NEW.status = 'approved') THEN
        
        -- Adiciona ao SALDO JOGO (balance)
        UPDATE public.profiles
        SET balance = COALESCE(balance, 0) + COALESCE(NEW.amount, 0)
        WHERE id = NEW.user_id;

        -- Registra transação
        INSERT INTO public.transactions (
            user_id, 
            amount, 
            type, 
            status, 
            reference_id, 
            created_by, 
            balance_type, 
            description
        )
        VALUES (
            NEW.user_id, 
            NEW.amount, 
            'deposit', 
            'approved', 
            NEW.id, 
            NEW.user_id, 
            'balance', 
            'Depósito via PIX Automático'
        );

        -- Notifica
        INSERT INTO public.user_notifications (user_id, message)
        VALUES (NEW.user_id, '✅ Seu depósito de R$ ' || NEW.amount::text || ' via PIX foi confirmado!');

        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        PERFORM public.trigger_pwa_push(
            p_title := '💰 Depósito Confirmado!',
            p_body := 'O usuário ' || COALESCE(v_user_name, 'Usuário') || ' depositou R$ ' || NEW.amount::text || ' via PIX Automático.',
            p_target := 'admins', p_url := '/admin'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
