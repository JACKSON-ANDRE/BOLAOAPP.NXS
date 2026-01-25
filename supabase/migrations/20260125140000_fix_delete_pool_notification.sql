-- MIGRATION: FIX DELETE POOL NOTIFICATIONS
-- Data: 25/01/2026
-- Objetivo: Garantir que o cancelamento de bolão envie notificação aos usuários.

CREATE OR REPLACE FUNCTION delete_pool_with_refund(p_pool_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bet RECORD;
    v_pool_title TEXT;
    v_admin_id UUID;
    v_msg TEXT;
BEGIN
    -- 1. Verificar se o bolão existe
    SELECT title INTO v_pool_title FROM pools WHERE id = p_pool_id;
    IF v_pool_title IS NULL THEN 
        RAISE EXCEPTION 'Bolão não encontrado.'; 
    END IF;

    v_admin_id := auth.uid();

    -- 2. Percorrer todas as apostas para reembolsar e NOTIFICAR
    FOR v_bet IN SELECT * FROM bets WHERE pool_id = p_pool_id LOOP
        
        -- A. Devolve o dinheiro
        UPDATE profiles 
        SET balance = balance + v_bet.amount 
        WHERE id = v_bet.user_id;

        -- B. Registra a transação
        INSERT INTO transactions (user_id, amount, type, status, reference_id, balance_type, created_by)
        VALUES (v_bet.user_id, v_bet.amount, 'refund', 'approved', p_pool_id, 'balance', v_admin_id);

        -- C. Notifica o usuário
        v_msg := 'O bolão "' || v_pool_title || '" foi cancelado. R$ ' || v_bet.amount || ' foram estornados para sua conta.';
        
        INSERT INTO user_notifications (user_id, message)
        VALUES (v_bet.user_id, v_msg);

    END LOOP;

    -- 3. Exclui apostas e depois o bolão
    DELETE FROM bets WHERE pool_id = p_pool_id;
    DELETE FROM pools WHERE id = p_pool_id;
END;
$$;
