
-- 1. Fix user_notifications to support system messages (independent of admin_messages)
DO $$ 
BEGIN
    -- Add 'message' column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'message') THEN
        ALTER TABLE user_notifications ADD COLUMN message text;
    END IF;

    -- Make admin_message_id nullable if it isn't already
    ALTER TABLE user_notifications ALTER COLUMN admin_message_id DROP NOT NULL;
END $$;

-- 2. Create Trigger to automatically update profile balance on transaction (if not exists logic handled by replace)
CREATE OR REPLACE FUNCTION public.handle_new_transaction()
RETURNS trigger AS $$
BEGIN
  -- Only update balance for approved deposits
  IF NEW.type = 'deposit' AND NEW.status = 'approved' THEN
    UPDATE profiles
    SET balance = balance + NEW.amount
    WHERE id = NEW.user_id;
  END IF;
  
  -- Logic for other transaction types can be added here if needed
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger first to ensure clean recreation (optional but safer)
DROP TRIGGER IF EXISTS on_transaction_created ON transactions;

CREATE TRIGGER on_transaction_created
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_transaction();

-- 3. Re-create the RPC Function with STRICT signature and security definer
DROP FUNCTION IF EXISTS public.process_deposit_request(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.process_deposit_request(text, text, text, text); -- Drop potential mismatch signatures

CREATE OR REPLACE FUNCTION public.process_deposit_request(
  p_deposit_request_id uuid,
  p_admin_id uuid,
  p_action text,
  p_reason text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/admin), bypassing RLS for the updates
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

  -- If Approved, Create Transaction (Trigger will handle balance update)
  IF p_action = 'approve' THEN
    INSERT INTO transactions (user_id, amount, type, status, reference_id, created_at)
    VALUES (
      v_deposit_request.user_id,
      v_deposit_request.amount,
      'deposit',
      'approved',
      p_deposit_request_id,
      now()
    );
  END IF;

END;
$$;

-- 4. Grant Permissions
GRANT EXECUTE ON FUNCTION public.process_deposit_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_deposit_request TO service_role;
GRANT EXECUTE ON FUNCTION public.process_deposit_request TO anon; -- Sometimes needed if auth state is lost, but usually authenticated is enough.
