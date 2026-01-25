-- FUNCTION: delete_pool
-- Handles pool deletion with automatic refunds for all bettors.

CREATE OR REPLACE FUNCTION public.delete_pool(
    p_pool_id uuid,
    p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pool record;
    v_bet record;
BEGIN
    -- 1. Get Pool
    SELECT * INTO v_pool FROM public.pools WHERE id = p_pool_id;
    
    IF v_pool.status = 'finished' THEN
        RAISE EXCEPTION 'Não é possível excluir um bolão já finalizado.';
    END IF;

    -- 2. Verify Permission (Organizer or Admin)
    IF v_pool.creator_id <> p_admin_id AND 
       NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Sem permissão para excluir este bolão.';
    END IF;

    -- 3. Refund All Bets
    FOR v_bet IN 
        SELECT * FROM public.bets WHERE pool_id = p_pool_id
    LOOP
        -- Credit User Back
        UPDATE public.profiles 
        SET balance = balance + v_bet.amount
        WHERE id = v_bet.user_id;

        -- Log Refund Transaction
        INSERT INTO public.transactions (user_id, amount, type, status, reference_id)
        VALUES (v_bet.user_id, v_bet.amount, 'refund', 'approved', p_pool_id);
    END LOOP;

    -- 4. Delete Bets (Cascade would do this, but explicit is safer after refund loop)
    DELETE FROM public.bets WHERE pool_id = p_pool_id;

    -- 5. Delete Pool
    DELETE FROM public.pools WHERE id = p_pool_id;

END;
$$;
