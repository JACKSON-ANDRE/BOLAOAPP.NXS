-- FIX DOUBLE DEDUCTION IN PLACE_BET
-- Purpose: Remove explicit balance deduction from place_bet since the trigger 'on_transaction_created' already does it.

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
    SELECT * INTO v_pool FROM public.pools WHERE id = p_pool_id;
    
    -- Validações
    IF v_pool IS NULL THEN RAISE EXCEPTION 'Bolão não encontrado.'; END IF;
    IF v_pool.status <> 'open' THEN RAISE EXCEPTION 'Bolão fechado.'; END IF;
    IF v_pool.bets_deadline IS NOT NULL AND NOW() > v_pool.bets_deadline THEN RAISE EXCEPTION 'Prazo encerrado.'; END IF;

    -- Lock Profile (Trava de Segurança)
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE; 

    IF v_profile.balance < v_pool.entry_fee THEN RAISE EXCEPTION 'Saldo insuficiente.'; END IF;
    
    -- Checa Duplicidade
    IF EXISTS (SELECT 1 FROM public.bets WHERE pool_id = p_pool_id AND user_id = p_user_id) THEN 
        RAISE EXCEPTION 'Aposta já realizada.'; 
    END IF;

    -- Executa
    -- REMOVIDO: UPDATE public.profiles SET balance = balance - v_pool.entry_fee ...
    -- O TRIGGER na tabela transactions fará isso automaticamente assim que o insert abaixo ocorrer.
    
    INSERT INTO public.bets (pool_id, user_id, amount, selected_option, status)
    VALUES (p_pool_id, p_user_id, v_pool.entry_fee, p_selected_option, 'pending')
    RETURNING id INTO v_bet_id;

    -- O Trigger 'on_transaction_created' vai rodar aqui e descontar o saldo
    INSERT INTO public.transactions (user_id, amount, type, status, reference_id, balance_type, created_by)
    VALUES (p_user_id, v_pool.entry_fee, 'bet_debit', 'approved', p_pool_id, 'balance', p_user_id);

    RETURN json_build_object('success', true);
END;
$$;
