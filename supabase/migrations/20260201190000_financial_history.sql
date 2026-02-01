-- FINANCIAL HISTORY MIGRATION
-- Goal: Ensure 'balance_before' and 'balance_after' are recorded for EVERY financial transaction.

-- 1. Add Columns (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'balance_before') THEN
        ALTER TABLE transactions ADD COLUMN balance_before numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'balance_after') THEN
        ALTER TABLE transactions ADD COLUMN balance_after numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'balance_type') THEN
        ALTER TABLE transactions ADD COLUMN balance_type text; -- 'game' or 'withdrawable'
    END IF;
END $$;

-- 2. Update process_withdraw_request (Withdrawals)
-- Explicitly inserts history. Profile is updated BEFORE insert.
DROP FUNCTION IF EXISTS public.process_withdraw_request(uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION public.process_withdraw_request(
  p_withdraw_id uuid,
  p_admin_id uuid,
  p_action text, -- 'approve' or 'reject'
  p_reason text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request record;
  v_user_balance numeric;
  v_bal_before numeric;
  v_bal_after numeric;
BEGIN
  -- 1. Check Admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores.';
  END IF;

  -- 2. Fetch Request
  SELECT * INTO v_request FROM withdraw_requests WHERE id = p_withdraw_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada.';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Esta solicitação já foi processada.';
  END IF;

  -- 3. Process Logic
  IF p_action = 'approve' THEN
    
    -- Check Balance strictly before approving
    SELECT withdrawable_balance INTO v_user_balance FROM profiles WHERE id = v_request.user_id;
    
    IF v_user_balance < v_request.amount THEN
        RAISE EXCEPTION 'Saldo insuficiente para aprovação.';
    END IF;

    -- CAPTURE BEFORE STATE
    v_bal_before := v_user_balance;
    v_bal_after := v_user_balance - v_request.amount;

    -- Deduct Balance (ONLY WITHDRAWABLE)
    UPDATE profiles 
    SET withdrawable_balance = v_bal_after
    WHERE id = v_request.user_id;

    -- Update Request
    UPDATE withdraw_requests
    SET status = 'approved',
        reviewed_by = p_admin_id,
        reviewed_at = now()
    WHERE id = p_withdraw_id;

    -- Notify
    INSERT INTO user_notifications (user_id, message, created_at)
    VALUES (v_request.user_id, 'Seu saque de R$ ' || v_request.amount || ' foi aprovado. O valor será creditado em até 2 horas.', now());

    -- Create Transaction Record for History WITH METADATA
    INSERT INTO transactions (user_id, amount, type, status, created_at, created_by, reference_id, balance_type, balance_before, balance_after)
    VALUES (
        v_request.user_id, 
        v_request.amount, 
        'withdrawal', 
        'approved', 
        now(), 
        p_admin_id, 
        p_withdraw_id,
        'withdrawable', -- Metadata
        v_bal_before, -- History
        v_bal_after   -- History
    );

  ELSIF p_action = 'reject' THEN
    
    -- Update Request
    UPDATE withdraw_requests
    SET status = 'rejected',
        reviewed_by = p_admin_id,
        reviewed_at = now(),
        rejection_reason = p_reason
    WHERE id = p_withdraw_id;

    -- Notify
    INSERT INTO user_notifications (user_id, message, created_at)
    VALUES (v_request.user_id, 'Sua solicitação de saque foi rejeitada. Motivo: ' || COALESCE(p_reason, 'Não informado'), now());
  
  ELSE
    RAISE EXCEPTION 'Ação inválida. Use approve ou reject.';
  END IF;

END;
$$;

-- 3. Update finish_pool (Winnings)
-- Explicitly inserts history. Profile is updated BEFORE insert.
DROP FUNCTION IF EXISTS public.finish_pool(uuid, text, uuid);

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
    v_current_withdrawable numeric;
BEGIN
    -- 1. LOCK the pool row to prevent concurrent executions
    SELECT * INTO v_pool 
    FROM public.pools 
    WHERE id = p_pool_id 
    FOR UPDATE; 

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
        LOOP
            -- Get Current Balance (Before Update) via FOR UPDATE to be safe? 
            -- Just plain select is OK inside this loop as user isn't likely doing ms transactions
            SELECT withdrawable_balance INTO v_current_withdrawable FROM public.profiles WHERE id = v_bet.user_id;

            -- Update User Balance (Atomic increment)
            UPDATE public.profiles 
            SET withdrawable_balance = withdrawable_balance + v_prize_share,
                total_won = COALESCE(total_won, 0) + v_prize_share,
                win_count = COALESCE(win_count, 0) + 1
            WHERE id = v_bet.user_id;

            -- Create Transaction Log WITH HISTORY
            INSERT INTO public.transactions (user_id, amount, type, status, reference_id, balance_type, created_by, balance_before, balance_after)
            VALUES (
                v_bet.user_id, 
                v_prize_share, 
                'winning', 
                'approved', 
                p_pool_id, 
                'withdrawable', 
                p_admin_id,
                v_current_withdrawable, -- Before
                v_current_withdrawable + v_prize_share -- After
            );
            
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
        -- No winners
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

-- 4. TRIGGER FOR DEPOSITS & OTHERS
-- This trigger handles cases where the transaction is inserted FIRST, then balance is updated (Default Flow).
-- OR it backfills history if the insert happens but no explicit history was provided.

CREATE OR REPLACE FUNCTION public.handle_transaction_history()
RETURNS trigger AS $$
DECLARE
    v_current_balance numeric;
    v_is_game_balance boolean := false;
BEGIN
    -- If history already provided (by explicit RPCs), skip.
    IF NEW.balance_before IS NOT NULL AND NEW.balance_after IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Determine Balance Type
    IF NEW.type IN ('deposit', 'bet', 'bet_debit', 'bet_refund', 'manual_adjustment') THEN
        v_is_game_balance := true;
        NEW.balance_type := 'game';
    ELSIF NEW.type IN ('withdraw', 'withdrawal', 'winning', 'prize', 'bonus', 'bet_credit', 'manual_adjustment_withdraw') THEN
        v_is_game_balance := false;
        NEW.balance_type := 'withdrawable';
    ELSE
        -- Default?
        v_is_game_balance := true;
        NEW.balance_type := 'game';
    END IF;

    -- Fetch CURRENT balance (At this moment).
    -- If this is a BEFORE INSERT trigger, the balance has NOT been updated yet by any AFTER triggers.
    SELECT 
        CASE WHEN v_is_game_balance THEN balance ELSE withdrawable_balance END
    INTO v_current_balance
    FROM profiles
    WHERE id = NEW.user_id;

    -- Set History
    NEW.balance_before := v_current_balance;

    -- Calculate After based on Amount (Assuming Amount is Positive for Credit, Negative for Debit? Or Type based?)
    -- Convention checks:
    IF NEW.type IN ('deposit', 'winning', 'bonus', 'bet_credit', 'refund') THEN
        -- CREDIT
        NEW.balance_after := v_current_balance + NEW.amount;
    ELSIF NEW.type IN ('withdraw', 'withdrawal', 'bet', 'bet_debit') THEN
        -- DEBIT
        NEW.balance_after := v_current_balance - NEW.amount;
    ELSE
        -- Adjustments can be negative or positive.
        -- If amount is negative, it subtracts.
        NEW.balance_after := v_current_balance + NEW.amount;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach Trigger (BEFORE INSERT)
DROP TRIGGER IF EXISTS tr_transaction_history ON transactions;
CREATE TRIGGER tr_transaction_history
BEFORE INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_transaction_history();

-- 5. IMPORTANT: Conflict Resolution
-- If 'handle_new_transaction' (Separate Balances) is an AFTER trigger that updates the balance, 
-- then our BEFORE trigger above captures the "Clean" state (Before).
-- This logic holds.

