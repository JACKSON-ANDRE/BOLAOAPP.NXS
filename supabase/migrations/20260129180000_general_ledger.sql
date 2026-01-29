-- 1. ADICIONAR COLUNAS DE AUDITORIA NA TABELA TRANSACTIONS
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS balance_before numeric;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS balance_after numeric;

-- 2. ATUALIZAR A FUNÇÃO DE AJUSTE MANUAL DO ADMIN
-- Agora ela grava os saldos antes e depois para histórico perfeito.
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
    v_start_balance numeric;
    v_end_balance numeric;
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
    v_start_balance := v_current_amount;
    v_end_balance := p_new_amount;

    IF v_delta = 0 THEN
        RETURN json_build_object('success', false, 'message', 'O saldo novo é igual ao atual.');
    END IF;

    -- E. Apply Log (Transaction) WITH AUDIT COLUMNS
    INSERT INTO transactions (
        user_id,
        amount,
        type, 
        status,
        created_by,
        balance_type,
        created_at,
        description,
        balance_before, -- [NEW]
        balance_after   -- [NEW]
    ) VALUES (
        p_user_id,
        v_delta, 
        'admin_adjustment', 
        'approved',
        p_admin_id,
        CASE WHEN p_balance_type = 'withdrawable' THEN 'withdrawable' ELSE 'balance' END,
        now(),
        p_reason,
        v_start_balance, -- [NEW]
        v_end_balance    -- [NEW]
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
