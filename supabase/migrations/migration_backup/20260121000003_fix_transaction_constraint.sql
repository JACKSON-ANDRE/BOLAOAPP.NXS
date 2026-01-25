
-- FIX TRANSACTION CONSTRAINT (created_by)
-- Updated includes DROP FUNCTION to avoid "cannot change return type" error.

-- 1. Explicitly DROP the function first to allow signature/return type changes
DROP FUNCTION IF EXISTS public.process_deposit_request(uuid, uuid, text, text);

-- 2. Re-create with the correct logic including 'created_by'
CREATE OR REPLACE FUNCTION public.process_deposit_request(
  p_deposit_request_id uuid,
  p_admin_id uuid,
  p_action text,
  p_reason text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit_request record;
BEGIN
  -- Basic Admin Check
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores.';
  END IF;

  -- Fetch Deposit Request
  SELECT * INTO v_deposit_request FROM deposit_requests WHERE id = p_deposit_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Requisição de depósito não encontrada.';
  END IF;

  IF v_deposit_request.status != 'pending' THEN
    RAISE EXCEPTION 'Esta requisição já foi processada.';
  END IF;

  -- Update Deposit Request Status
  UPDATE deposit_requests
  SET 
    status = p_action,
    updated_at = now()
  WHERE id = p_deposit_request_id;

  -- Generate Notification content
  INSERT INTO user_notifications (user_id, message, created_at)
  VALUES (
    v_deposit_request.user_id,
    CASE 
      WHEN p_action = 'approve' THEN 'Seu depósito de R$ ' || v_deposit_request.amount || ' foi aprovado!'
      ELSE 'Seu depósito foi rejeitado. Motivo: ' || COALESCE(p_reason, 'Não informado')
    END,
    now()
  );

  -- If Approved, Create Transaction
  IF p_action = 'approve' THEN
    INSERT INTO transactions (
        user_id, 
        amount, 
        type, 
        status, 
        reference_id, 
        created_by, 
        created_at
    )
    VALUES (
      v_deposit_request.user_id,
      v_deposit_request.amount,
      'deposit',
      'approved',
      p_deposit_request_id,
      p_admin_id, 
      now()
    );
  END IF;

END;
$$;
