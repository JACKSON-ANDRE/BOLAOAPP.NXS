-- 🎯 RESET DO SALDO (VIA ID) - GARANTIDO 🎯
-- O anterior falhou por causa do nome/email.
-- Peguei seu ID exato da imagem anterior: 1e53d3ea-b75a-42ff-b4fa-a06324f131e3

DO $$
DECLARE
    -- SEU ID EXATO (Copiado dos logs)
    v_user_id uuid := '1e53d3ea-b75a-42ff-b4fa-a06324f131e3'; 
    v_target_amount numeric := 1000.00;
    v_current_balance numeric;
    v_delta numeric;
BEGIN
    -- 1. Achar o saldo atual
    SELECT balance INTO v_current_balance
    FROM profiles 
    WHERE id = v_user_id;

    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'ID incorreto. Verifique se copiou certo.';
    END IF;

    -- 2. Calcular Ajuste
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
        'admin_adjustment', 
        'approved',
        'balance', 
        now(),
        'Correção Final para Lançamento (Reset 1000)',
        v_user_id
    );

    -- 4. Atualizar Perfil
    UPDATE profiles 
    SET balance = v_target_amount
    WHERE id = v_user_id;

    RAISE NOTICE 'Sucesso! Saldo definido para R$ %', v_target_amount;
END $$;
