-- 🎯 RESET DO SALDO PARA R$ 1000,00 🎯
-- Use isso para corrigir o saldo final antes do lançamento.
-- O script calcula a diferença e cria uma transação de "Correção" automática.

DO $$
DECLARE
    v_user_email text := 'jackson'; -- Parte do email para achar você
    v_target_amount numeric := 1000.00;
    v_user_id uuid;
    v_current_balance numeric;
    v_delta numeric;
BEGIN
    -- 1. Achar o usuário (pega o último atualizado)
    SELECT id, balance INTO v_user_id, v_current_balance
    FROM profiles 
    WHERE email ILIKE '%' || v_user_email || '%'
    ORDER BY updated_at DESC
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado!';
    END IF;

    -- 2. Calcular quanto precisa somar ou tirar
    v_delta := v_target_amount - v_current_balance;

    RAISE NOTICE 'Saldo Atual: %. Meta: %. Ajuste Necessário: %', v_current_balance, v_target_amount, v_delta;

    IF v_delta = 0 THEN
        RAISE NOTICE 'Saldo já está correto!';
        RETURN;
    END IF;

    -- 3. Inserir Transação de Correção
    INSERT INTO transactions (
        user_id,
        amount,
        type,
        status,
        balance_type,
        created_at,
        description,
        created_by
    ) VALUES (
        v_user_id,
        v_delta,
        'admin_adjustment', -- Tipo compatível
        'approved',
        'balance', -- Saldo de Jogo
        now(),
        'Correção Final para Lançamento (Reset 1000)',
        v_user_id -- Auto-ajuste
    );

    -- 4. Atualizar Perfil
    UPDATE profiles 
    SET balance = v_target_amount
    WHERE id = v_user_id;

    RAISE NOTICE 'Sucesso! Saldo definido para R$ %', v_target_amount;
END $$;
