-- RPC: delete_pool_with_refund
-- Purpose: Atomically refund all bettors, log transactions, notify users, and delete the pool.
-- Parameters: pool_id (UUID)
-- Returns: void (throws error if failed)

CREATE OR REPLACE FUNCTION delete_pool_with_refund(p_pool_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pool pools%ROWTYPE;
    v_bet RECORD;
    v_refund_count INT := 0;
BEGIN
    -- 1. Get Pool Details
    SELECT * INTO v_pool FROM pools WHERE id = p_pool_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bolão não encontrado.';
    END IF;

    -- 2. Loop through all bets for this pool
    FOR v_bet IN SELECT * FROM bets WHERE pool_id = p_pool_id LOOP
        
        -- A. Refund the user (credit balance)
        UPDATE profiles
        SET balance = balance + v_bet.amount
        WHERE id = v_bet.user_id;

        -- B. Log the Refund Transaction
        -- Check if refund transaction already exists to avoid duplication (though typically we just do it once here)
        IF NOT EXISTS (
            SELECT 1 FROM transactions 
            WHERE user_id = v_bet.user_id 
            AND type = 'refund' 
            AND reference_id = p_pool_id::text
        ) THEN
            INSERT INTO transactions (user_id, amount, type, status, reference_id)
            VALUES (v_bet.user_id, v_bet.amount, 'refund', 'approved', p_pool_id::text);
            
            -- C. Notify the User
            INSERT INTO user_notifications (user_id, title, message, type)
            VALUES (
                v_bet.user_id, 
                'Bolão Cancelado - Reembolso', 
                format('O bolão "%s" foi cancelado/excluído. O valor de R$ %s foi estornado para sua conta.', v_pool.title, v_bet.amount),
                'info'
            );
        END IF;

        v_refund_count := v_refund_count + 1;
    END LOOP;

    -- 3. Delete Bets (Cascade usually handles this, but explicit is safer before pool delete if no cascade)
    DELETE FROM bets WHERE pool_id = p_pool_id;

    -- 4. Delete the Pool
    DELETE FROM pools WHERE id = p_pool_id;

    -- Optional logging
    RAISE NOTICE 'Bolão % excluído. % reembolsos processados.', p_pool_id, v_refund_count;

END;
$$;
