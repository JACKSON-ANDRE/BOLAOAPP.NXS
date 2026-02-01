-- FIX DELETE POOL REFUND
-- Purpose: Add missing 'balance_type' to refund transactions when deleting a pool.

CREATE OR REPLACE FUNCTION delete_pool_with_refund(p_pool_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bet RECORD;
    v_pool_title TEXT;
    v_admin_id UUID;
BEGIN
    -- Check if pool exists
    SELECT title INTO v_pool_title FROM pools WHERE id = p_pool_id;
    IF v_pool_title IS NULL THEN
        RAISE EXCEPTION 'Bolão não encontrado.';
    END IF;

    -- Get Admin ID (User executing the function)
    v_admin_id := auth.uid();

    -- Loop through all bets to refund
    FOR v_bet IN SELECT * FROM bets WHERE pool_id = p_pool_id LOOP
        -- 1. Refund Balance
        UPDATE profiles
        SET balance = balance + v_bet.amount
        WHERE id = v_bet.user_id;

        -- 2. Create Refund Transaction (FIXED: Added balance_type)
        INSERT INTO transactions (user_id, amount, type, status, reference_id, balance_type, created_by)
        VALUES (
            v_bet.user_id, 
            v_bet.amount, 
            'refund', 
            'approved', 
            p_pool_id, 
            'balance', -- Refund goes back to Game Balance
            v_admin_id
        );

        -- 3. Notify User
        INSERT INTO user_notifications (user_id, title, message, type)
        VALUES (
            v_bet.user_id,
            'Bolão Cancelado',
            format('O bolão "%s" foi cancelado pelo administrador. O valor de R$ %s foi estornado para seu saldo.', v_pool_title, to_char(v_bet.amount, 'FM999G999D00')),
            'warning'
        );
    END LOOP;

    -- Delete bets first (cascade might handle this, but safer explicit)
    DELETE FROM bets WHERE pool_id = p_pool_id;

    -- Delete pool
    DELETE FROM pools WHERE id = p_pool_id;
END;
$$;
