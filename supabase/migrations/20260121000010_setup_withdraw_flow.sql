
-- SETUP WITHDRAW FLOW (Table, Columns, Policies, RPC)
-- v3: Fixed negative amount in transaction (Constraint enforces positive values)

DO $$
BEGIN
    ----------------------------------------------------------------
    -- 1. PREPARE PROFILES (Add withdrawable_balance)
    ----------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'withdrawable_balance') THEN
        ALTER TABLE profiles ADD COLUMN withdrawable_balance numeric DEFAULT 0;
        
        -- Sync initial logic: Assume current balance is withdrawable for now
        UPDATE profiles SET withdrawable_balance = balance;
    END IF;

    ----------------------------------------------------------------
    -- 2. CREATE withdraw_requests TABLE
    ----------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'withdraw_requests') THEN
        CREATE TABLE withdraw_requests (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id uuid REFERENCES auth.users(id) NOT NULL,
            amount numeric NOT NULL,
            pix_key text NOT NULL,
            status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            reviewed_by uuid REFERENCES auth.users(id),
            reviewed_at timestamp with time zone,
            rejection_reason text,
            created_at timestamp with time zone DEFAULT now()
        );

        -- RLS POLICIES
        ALTER TABLE withdraw_requests ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can insert own requests" ON withdraw_requests
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can view own requests" ON withdraw_requests
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Admins can do everything" ON withdraw_requests
            FOR ALL USING (
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
            );
    END IF;

END $$;

----------------------------------------------------------------
-- 3. CREATE RPC: process_withdraw_request
----------------------------------------------------------------
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

    -- Deduct Balance
    UPDATE profiles 
    SET withdrawable_balance = withdrawable_balance - v_request.amount,
        balance = balance - v_request.amount
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
    -- IMPORTANT: 'amount' must be positive due to constraint. 'type' determines direction.
    INSERT INTO transactions (user_id, amount, type, status, created_at, created_by, reference_id, balance_type)
    VALUES (
        v_request.user_id, 
        v_request.amount, -- <--- CORRECTED: Positive amount
        'withdrawal', 
        'approved', 
        now(), 
        p_admin_id, 
        p_withdraw_id,
        'balance'
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
