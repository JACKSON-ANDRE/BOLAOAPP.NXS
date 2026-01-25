-- 🚨 FIX WITHDRAW DEDUCTION (CRITICAL AUDIT FINDING) 🚨
-- Issue: The system was deducting the withdrawal amount from BOTH 'balance' and 'withdrawable_balance'.
-- Fix: Deduct ONLY from 'withdrawable_balance', as 'balance' is strictly for Game Money.

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
    
    -- Check STRICTLY withdrawable_balance
    SELECT withdrawable_balance INTO v_user_balance FROM profiles WHERE id = v_request.user_id;
    
    IF v_user_balance < v_request.amount THEN
        RAISE EXCEPTION 'Saldo de saque insuficiente para aprovação.';
    END IF;

    -- Deduct Balance (ONLY WITHDRAWABLE)
    UPDATE profiles 
    SET withdrawable_balance = withdrawable_balance - v_request.amount
    -- REMOVED: balance = balance - v_request.amount (Wrong!)
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

    -- Create Transaction
    INSERT INTO transactions (user_id, amount, type, status, created_at, created_by, reference_id, balance_type)
    VALUES (
        v_request.user_id, 
        v_request.amount, 
        'withdrawal', 
        'approved', 
        now(), 
        p_admin_id, 
        p_withdraw_id,
        'withdrawable' -- Explicitly mark as withdrawable type
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
