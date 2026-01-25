-- SEPARATE BALANCES: Game Balance vs Withdrawable Balance

-- 1. Update Trigger Logic to handle different transaction types corresponding to different balances
CREATE OR REPLACE FUNCTION public.handle_new_transaction()
RETURNS trigger AS $$
BEGIN
  -- DEPOSIT: Adds to Game Balance (balance)
  IF NEW.type = 'deposit' AND NEW.status = 'approved' THEN
    UPDATE profiles
    SET balance = balance + NEW.amount
    WHERE id = NEW.user_id;
  
  -- WINNING / PRIZE: Adds to Withdrawable Balance
  ELSIF (NEW.type = 'winning' OR NEW.type = 'bet_credit') AND NEW.status = 'approved' THEN
    UPDATE profiles
    SET withdrawable_balance = withdrawable_balance + NEW.amount
    WHERE id = NEW.user_id;

  -- BET: Deducts from Game Balance
  ELSIF (NEW.type = 'bet' OR NEW.type = 'bet_debit') AND NEW.status = 'approved' THEN
    UPDATE profiles
    SET balance = balance - NEW.amount
    WHERE id = NEW.user_id;

  -- WITHDRAWAL: Deducts from Withdrawable Balance
  ELSIF (NEW.type = 'withdrawal' OR NEW.type = 'withdraw') AND NEW.status = 'approved' THEN
    -- Note: Ideally withdrawal RPC handles this, but this trigger ensures consistency if manual insert
    -- However, if RPC already deducted, we shouldn't do it again.
    -- Current RPC deducts explicitly. We will REMOVE explicit deduction from RPC and let Trigger handle it?
    -- OR we keep RPC deduction and this trigger acts as backup?
    -- DECISION: Let RPC handle it for now to avoid race conditions with checks, 
    -- BUT we will fix the RPC to ONLY deduct withdrawable_balance.
    -- If we rely on triggers, we need to be careful. 
    -- Let's stick to RPC doing the deduction for Withdrawals for now as it does the check first.
    NULL; 
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. FIX process_withdraw_request to ONLY deduct withdrawable_balance
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

    -- Deduct Balance (ONLY WITHDRAWABLE)
    UPDATE profiles 
    SET withdrawable_balance = withdrawable_balance - v_request.amount
    -- REMOVED: balance = balance - v_request.amount
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

    -- Create Transaction Record for History
    INSERT INTO transactions (user_id, amount, type, status, created_at, created_by, reference_id, balance_type)
    VALUES (
        v_request.user_id, 
        v_request.amount, 
        'withdrawal', 
        'approved', 
        now(), 
        p_admin_id, 
        p_withdraw_id,
        'withdrawable' -- Metadata
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
