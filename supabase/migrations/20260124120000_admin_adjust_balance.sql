-- SAFE MANUAL BALANCE ADJUSTMENT RPC
-- Allows Admin to set a new balance. The system calculates the difference and logs it.
-- Prevents "Shadow Money" by ensuring every change has a transaction record.

-- 1. Ensure 'description' column exists in transactions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'description') THEN
        ALTER TABLE transactions ADD COLUMN description text;
    END IF;
END $$;

-- 2. Create the Adjustment Function
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
    p_user_id uuid,
    p_new_amount numeric,
    p_balance_type text, -- 'balance' (Jogo) or 'withdrawable' (Saque)
    p_reason text,
    p_admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_amount numeric;
    v_delta numeric;
    v_user_email text;
BEGIN
    -- A. Verify Admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    -- B. Validate Input
    IF p_new_amount < 0 THEN
        RAISE EXCEPTION 'O saldo não pode ser negativo.';
    END IF;
    
    IF COALESCE(p_reason, '') = '' THEN
        RAISE EXCEPTION 'É obrigatório informar o motivo do ajuste.';
    END IF;

    -- C. Get Current State
    SELECT email, 
           CASE WHEN p_balance_type = 'withdrawable' THEN withdrawable_balance ELSE balance END
    INTO v_user_email, v_current_amount
    FROM profiles 
    WHERE id = p_user_id;

    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado.';
    END IF;

    -- D. Calculate Delta
    v_delta := p_new_amount - v_current_amount;

    IF v_delta = 0 THEN
        RETURN json_build_object('success', false, 'message', 'O saldo novo é igual ao atual.');
    END IF;

    -- E. Apply Log (Transaction)
    INSERT INTO transactions (
        user_id,
        amount,
        type, 
        status,
        created_by,
        balance_type,
        created_at,
        description -- New Column
    ) VALUES (
        p_user_id,
        v_delta, 
        'admin_adjustment', 
        'approved',
        p_admin_id,
        CASE WHEN p_balance_type = 'withdrawable' THEN 'withdrawable' ELSE 'balance' END,
        now(),
        p_reason
    );

    -- F. Apply Update
    IF p_balance_type = 'withdrawable' THEN
        UPDATE profiles SET withdrawable_balance = p_new_amount WHERE id = p_user_id;
    ELSE
        UPDATE profiles SET balance = p_new_amount WHERE id = p_user_id;
    END IF;

    -- G. Notification
    INSERT INTO user_notifications (user_id, message, created_at)
    VALUES (
        p_user_id, 
        'Seu saldo foi ajustado manualmente pelo suporte. Novo valor: R$ ' || p_new_amount || '. Motivo: ' || p_reason, 
        now()
    );

    RETURN json_build_object('success', true, 'delta', v_delta);
END;
$$;
