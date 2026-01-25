-- 🚨 FIX DEPOSIT BALANCE UPDATE (CRITICAL) 🚨
-- The RPC 'process_deposit_request' was relying on a trigger to update the balance.
-- Since we removed the triggers to prevent double-spending, we must now UPDATE THE BALANCE EXPLICITLY in the RPC.

CREATE OR REPLACE FUNCTION public.process_deposit_request(
  p_deposit_request_id uuid,
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
  v_deposit_request record;
  v_new_status text;
BEGIN
  -- 1. Map action to correct DB status
  IF p_action = 'approve' THEN
    v_new_status := 'approved';
  ELSIF p_action = 'reject' THEN
    v_new_status := 'rejected';
  ELSE
    RAISE EXCEPTION 'Invalid action. Use approve or reject.';
  END IF;

  -- 2. Basic Admin Check
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores.';
  END IF;

  -- 3. Fetch Deposit Request
  SELECT * INTO v_deposit_request FROM deposit_requests WHERE id = p_deposit_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Requisição de depósito não encontrada.';
  END IF;

  IF v_deposit_request.status != 'pending' THEN
    RAISE EXCEPTION 'Esta requisição já foi processada.';
  END IF;

  -- 4. Update Deposit Request Status
  UPDATE deposit_requests
  SET 
    status = v_new_status,
    updated_at = now()
  WHERE id = p_deposit_request_id;

  -- 5. Generate Notification
  INSERT INTO user_notifications (user_id, message, created_at)
  VALUES (
    v_deposit_request.user_id,
    CASE 
      WHEN p_action = 'approve' THEN 'Seu depósito de R$ ' || v_deposit_request.amount || ' foi aprovado!'
      ELSE 'Seu depósito foi rejeitado. Motivo: ' || COALESCE(p_reason, 'Não informado')
    END,
    now()
  );

  -- 6. If Approved:
  IF p_action = 'approve' THEN
  
    -- A. EXPLICITLY CREDIT USER BALANCE (Missing Step Fixed)
    UPDATE public.profiles
    SET balance = balance + v_deposit_request.amount
    WHERE id = v_deposit_request.user_id;

    -- B. Create Transaction Record
    INSERT INTO transactions (
        user_id, 
        amount, 
        type, 
        status, 
        reference_id, 
        created_by,
        balance_type, 
        created_at
    )
    VALUES (
      v_deposit_request.user_id,
      v_deposit_request.amount,
      'deposit',
      'approved',
      p_deposit_request_id,
      p_admin_id,
      'balance',
      now()
    );
  END IF;

END;
$$;
