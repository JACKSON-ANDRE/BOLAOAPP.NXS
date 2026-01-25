-- PROTEÇÃO MÁXIMA PARA APOSTAS (CIRCUIT BREAKER) 🛡️
-- Esta versão verifica se o dinheiro REALMENTE saiu da conta.
-- Se o saldo não mudar, a aposta é cancelada instantaneamente.

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
    v_rows_affected int;
BEGIN
    -- 1. Validar Bolão (Prazos, Status)
    SELECT * INTO v_pool 
    FROM public.pools 
    WHERE id = p_pool_id;

    IF v_pool IS NULL THEN RAISE EXCEPTION 'Bolão não encontrado.'; END IF;
    IF v_pool.status <> 'open' THEN RAISE EXCEPTION 'Este bolão não está aceitando apostas (Status fechado).'; END IF;
    
    -- Validação de Prazos
    IF v_pool.bets_deadline IS NOT NULL AND NOW() > v_pool.bets_deadline THEN 
        RAISE EXCEPTION 'O prazo para apostas encerrou (Deadline).'; 
    END IF;
    IF v_pool.bets_deadline IS NULL AND NOW() > v_pool.scheduled_at THEN
        RAISE EXCEPTION 'O evento já começou.'; 
    END IF;

    -- 2. BLOQUEAR & Validar Saldo (Crucial: Impede gastar o que não tem)
    SELECT * INTO v_profile 
    FROM public.profiles 
    WHERE id = p_user_id 
    FOR UPDATE; -- <--- Trava o saldo para evitar condições de corrida

    IF v_profile.balance < v_pool.entry_fee THEN
        RAISE EXCEPTION 'Saldo insuficiente. Você tem R$ % e precisa de R$ %', v_profile.balance, v_pool.entry_fee;
    END IF;

    -- 3. Evitar Aposta Dupla
    IF EXISTS (SELECT 1 FROM public.bets WHERE pool_id = p_pool_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'Você já apostou neste bolão.';
    END IF;

    -- 4. TRANSAÇÃO FINANCEIRA (AQUI QUE OCORRE A COBRANÇA)
    -- Descontar do Usuario
    UPDATE public.profiles 
    SET balance = balance - v_pool.entry_fee 
    WHERE id = p_user_id;

    -- 🚨 VERIFICAÇÃO DE SEGURANÇA (CIRCUIT BREAKER) 🚨
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected = 0 THEN
        RAISE EXCEPTION 'ERRO CRÍTICO: Falha ao debitar saldo. Aposta cancelada por segurança.';
    END IF;

    -- Inserir Transação de Débito (Extrato)
    INSERT INTO public.transactions (user_id, amount, type, status, reference_id, balance_type, created_by)
    VALUES (p_user_id, v_pool.entry_fee, 'bet_debit', 'approved', p_pool_id, 'balance', p_user_id);

    -- 5. Inserir a Aposta
    INSERT INTO public.bets (pool_id, user_id, amount, selected_option, status)
    VALUES (p_pool_id, p_user_id, v_pool.entry_fee, p_selected_option, 'pending')
    RETURNING id INTO v_bet_id;

    -- Incrementar participantes do bolão (Cache Counter)
    UPDATE public.pools 
    SET current_participants = current_participants + 1 
    WHERE id = p_pool_id;

    RETURN json_build_object(
        'success', true, 
        'bet_id', v_bet_id,
        'new_balance', (v_profile.balance - v_pool.entry_fee)
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;
