-- CORREÇÃO: REMOVER NOTIFICAÇÃO DUPLICADA
-- O ajuste manual estava mandando aviso E o sistema mandava outro (Gatilho).
-- Vamos remover o aviso manual para ficar apenas UM.

CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
    p_user_id uuid,
    p_new_amount numeric,
    p_balance_type text,
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
    -- 1. Validações
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    -- Permite valor negativo agora (pois removemos a constraint antes)
    -- Remover checagem de < 0 se existir no código anterior, mas validação de lógica de negócio pode manter ou tirar. 
    -- Como é ajuste manual, pode ser qualquer valor.

    IF COALESCE(p_reason, '') = '' THEN
        RAISE EXCEPTION 'É obrigatório informar o motivo do ajuste.';
    END IF;

    -- 2. Busca Saldo Atual
    SELECT email, 
           CASE WHEN p_balance_type = 'withdrawable' THEN withdrawable_balance ELSE balance END
    INTO v_user_email, v_current_amount
    FROM profiles 
    WHERE id = p_user_id;

    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado.';
    END IF;

    -- 3. Calcula Diferença
    v_delta := p_new_amount - v_current_amount;

    IF v_delta = 0 THEN
        RETURN json_build_object('success', false, 'message', 'O saldo novo é igual ao atual.');
    END IF;

    -- 4. Insere Transação (ISSO JÁ DISPARA O GATILHO DE NOTIFICAÇÃO DO SISTEMA)
    INSERT INTO transactions (
        user_id,
        amount,
        type, 
        status,
        created_by,
        balance_type,
        created_at,
        description
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

    -- 5. Atualiza o Saldo
    IF p_balance_type = 'withdrawable' THEN
        UPDATE profiles SET withdrawable_balance = p_new_amount WHERE id = p_user_id;
    ELSE
        UPDATE profiles SET balance = p_new_amount WHERE id = p_user_id;
    END IF;

    -- 6. REMOVIDO: INSERT INTO user_notifications... (Evita duplicidade)

    RETURN json_build_object('success', true, 'delta', v_delta);
END;
$$;
