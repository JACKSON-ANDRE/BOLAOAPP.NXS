-- ATOMIC PLACE BET RPC
-- Purpose: Handle the entire betting flow (Balance Check -> Deduction -> Bet Insert -> Transaction) atomically.

CREATE OR REPLACE FUNCTION public.place_bet(
    p_pool_id uuid,
    p_user_id uuid,
    p_selected_option text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pool record;
    v_profile record;
    v_bet_id uuid;
BEGIN
    -- 1. Validate Pool (Locking optional here, but good for deadline race conditions)
    SELECT * INTO v_pool 
    FROM public.pools 
    WHERE id = p_pool_id;

    IF v_pool IS NULL THEN RAISE EXCEPTION 'Bolão não encontrado.'; END IF;
    IF v_pool.status <> 'open' THEN RAISE EXCEPTION 'Este bolão não está aceitando apostas.'; END IF;
    IF v_pool.bets_deadline IS NOT NULL AND NOW() > v_pool.bets_deadline THEN 
        RAISE EXCEPTION 'O prazo para apostas encerrou.'; 
    END IF;
    -- Fallback for scheduled_at if deadline not set
    IF v_pool.bets_deadline IS NULL AND NOW() > v_pool.scheduled_at THEN
        RAISE EXCEPTION 'O evento já começou.'; 
    END IF;

    -- 2. Lock & Validate Profile (Bank-Grade: Prevent concurrent bets exceeding balance)
    SELECT * INTO v_profile 
    FROM public.profiles 
    WHERE id = p_user_id 
    FOR UPDATE; -- Critical: Locks the balance

    IF v_profile.balance < v_pool.entry_fee THEN
        RAISE EXCEPTION 'Saldo insuficiente. Recarregue sua carteira.';
    END IF;

    -- 3. Check for existing bet (Double bet prevention)
    IF EXISTS (SELECT 1 FROM public.bets WHERE pool_id = p_pool_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'Você já apostou neste bolão.';
    END IF;

    -- 4. Execute Financial Transaction
    -- Deduct Balance
    UPDATE public.profiles 
    SET balance = balance - v_pool.entry_fee 
    WHERE id = p_user_id;

    -- Insert Bet
    INSERT INTO public.bets (pool_id, user_id, amount, selected_option, status)
    VALUES (p_pool_id, p_user_id, v_pool.entry_fee, p_selected_option, 'pending')
    RETURNING id INTO v_bet_id;

    -- Insert Transaction Log
    INSERT INTO public.transactions (user_id, amount, type, status, reference_id, balance_type, created_by)
    VALUES (p_user_id, v_pool.entry_fee, 'bet_debit', 'approved', p_pool_id, 'balance', p_user_id);

    -- 5. Return Success
    RETURN json_build_object(
        'success', true, 
        'bet_id', v_bet_id,
        'new_balance', (v_profile.balance - v_pool.entry_fee)
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE; -- Propagate error to Supabase client
END;
$$;
