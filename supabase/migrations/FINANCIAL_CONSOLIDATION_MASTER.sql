-- FINANCIAL CONSOLIDATION MASTER
-- [🎯] Objetivo: Unificar a lógica de depósitos, saques e auditoria (antes/depois).
-- [🛡️] Segurança: SECURITY DEFINER e validação rigorosa de saldo.

-- 1. ESTRUTURA DE AUDITORIA (Garante que as colunas existam)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS balance_before NUMERIC DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC DEFAULT 0;

-- 2. FUNÇÃO MESTRA: CREDITAR SALDO (Depósitos, Prêmios, Ajustes)
CREATE OR REPLACE FUNCTION public.credit_user_balance(
    p_user_id uuid,
    p_amount numeric,
    p_type text, -- 'deposit', 'winning', 'adjustment', 'refund'
    p_balance_type text, -- 'balance' (Jogo) or 'withdrawable' (Saque)
    p_description text,
    p_reference_id uuid DEFAULT null,
    p_admin_id uuid DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_balance numeric;
    v_new_balance numeric;
    v_title text;
BEGIN
    -- A. Pega saldo antigo
    IF p_balance_type = 'withdrawable' THEN
        SELECT COALESCE(withdrawable_balance, 0) INTO v_old_balance FROM public.profiles WHERE id = p_user_id;
    ELSE
        SELECT COALESCE(balance, 0) INTO v_old_balance FROM public.profiles WHERE id = p_user_id;
    END IF;

    v_new_balance := v_old_balance + p_amount;

    -- B. Atualiza Perfil
    IF p_balance_type = 'withdrawable' THEN
        UPDATE public.profiles SET withdrawable_balance = v_new_balance WHERE id = p_user_id;
    ELSE
        UPDATE public.profiles SET balance = v_new_balance WHERE id = p_user_id;
    END IF;

    -- C. Registra Transação (Auditoria)
    INSERT INTO public.transactions (
        user_id, amount, type, status, reference_id, created_by, 
        balance_type, description, balance_before, balance_after, created_at
    )
    VALUES (
        p_user_id, p_amount, p_type, 'approved', p_reference_id, COALESCE(p_admin_id, p_user_id),
        p_balance_type, p_description, v_old_balance, v_new_balance, now()
    );

    -- D. Notifica Usuário
    v_title := CASE 
        WHEN p_type = 'deposit' THEN 'Depósito Confirmado! 💰'
        WHEN p_type = 'winning' THEN 'Você Ganhou! 🎉'
        WHEN p_type = 'refund' THEN 'Reembolso Recebido 🔄'
        ELSE 'Saldo Atualizado 💸'
    END;

    INSERT INTO public.user_notifications (user_id, title, message, type)
    VALUES (p_user_id, v_title, p_description, 'success');
END;
$$;

-- 3. FUNÇÃO MESTRA: DEBITAR SALDO (Saques, Apostas)
CREATE OR REPLACE FUNCTION public.deduct_user_balance(
    p_user_id uuid,
    p_amount numeric,
    p_type text, -- 'withdraw', 'bet', 'adjustment'
    p_balance_type text, -- 'balance' (Jogo) or 'withdrawable' (Saque)
    p_description text,
    p_reference_id uuid DEFAULT null,
    p_admin_id uuid DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_balance numeric;
    v_new_balance numeric;
    v_title text;
BEGIN
    -- A. Pega saldo antigo e valida
    IF p_balance_type = 'withdrawable' THEN
        SELECT COALESCE(withdrawable_balance, 0) INTO v_old_balance FROM public.profiles WHERE id = p_user_id;
    ELSE
        SELECT COALESCE(balance, 0) INTO v_old_balance FROM public.profiles WHERE id = p_user_id;
    END IF;

    IF v_old_balance < p_amount THEN
        RAISE EXCEPTION 'Saldo insuficiente para realizar esta operação.';
    END IF;

    v_new_balance := v_old_balance - p_amount;

    -- B. Atualiza Perfil
    IF p_balance_type = 'withdrawable' THEN
        UPDATE public.profiles SET withdrawable_balance = v_new_balance WHERE id = p_user_id;
    ELSE
        UPDATE public.profiles SET balance = v_new_balance WHERE id = p_user_id;
    END IF;

    -- C. Registra Transação (Auditoria)
    INSERT INTO public.transactions (
        user_id, amount, type, status, reference_id, created_by, 
        balance_type, description, balance_before, balance_after, created_at
    )
    VALUES (
        p_user_id, p_amount, p_type, 'approved', p_reference_id, COALESCE(p_admin_id, p_user_id),
        p_balance_type, p_description, v_old_balance, v_new_balance, now()
    );

    -- D. Notifica Usuário (Opcional para apostas, mas bom para saques)
    IF p_type = 'withdraw' THEN
        INSERT INTO public.user_notifications (user_id, title, message, type)
        VALUES (p_user_id, 'Saque Realizado! 💸', p_description, 'info');
    END IF;
END;
$$;

-- 4. REFORMULAÇÃO: PROCESSAR DEPÓSITO (MANUAL ADMIN)
CREATE OR REPLACE FUNCTION public.process_deposit_request(
  p_deposit_request_id uuid,
  p_admin_id uuid,
  p_action text, -- 'approve' or 'reject'
  p_reason text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_req record;
BEGIN
  -- 1. Fetch Request
  SELECT * INTO v_req FROM public.deposit_requests WHERE id = p_deposit_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Requisição não encontrada.'; END IF;
  IF v_req.status != 'pending' THEN RAISE EXCEPTION 'Já processada.'; END IF;

  -- 2. Check Admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  -- 3. Process
  IF p_action = 'approve' THEN
    UPDATE public.deposit_requests SET status = 'approved', updated_at = now() WHERE id = p_deposit_request_id;
    
    PERFORM public.credit_user_balance(
        v_req.user_id, v_req.amount, 'deposit', 'balance', 
        'Depósito de R$ ' || v_req.amount || ' aprovado pelo administrador.',
        p_deposit_request_id, p_admin_id
    );
  ELSE
    UPDATE public.deposit_requests SET status = 'rejected', updated_at = now() WHERE id = p_deposit_request_id;
    
    INSERT INTO public.user_notifications (user_id, title, message, type)
    VALUES (v_req.user_id, 'Depósito Rejeitado ❌', 'Seu depósito foi rejeitado. Motivo: ' || COALESCE(p_reason, 'Não informado'), 'error');
  END IF;
END;
$$;

-- 5. REFORMULAÇÃO: PROCESSAR SAQUE (MANUAL ADMIN OU AUTO)
CREATE OR REPLACE FUNCTION public.process_withdraw_request(
  p_withdraw_id uuid,
  p_admin_id uuid,
  p_action text, -- 'approve' or 'reject'
  p_reason text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_req record;
BEGIN
  -- 1. Fetch Request
  SELECT * INTO v_req FROM public.withdraw_requests WHERE id = p_withdraw_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido de saque não encontrado.'; END IF;
  IF v_req.status != 'pending' THEN RAISE EXCEPTION 'Já processado.'; END IF;

  -- 2. Check Admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  -- 3. Process
  IF p_action = 'approve' THEN
    UPDATE public.withdraw_requests 
    SET status = 'approved', reviewed_by = p_admin_id, reviewed_at = now() 
    WHERE id = p_withdraw_id;
    
    -- Deduz o saldo de saque usando a função mestre
    PERFORM public.deduct_user_balance(
        v_req.user_id, v_req.amount, 'withdraw', 'withdrawable', 
        'Saque de R$ ' || v_req.amount || ' aprovado com sucesso.',
        p_withdraw_id, p_admin_id
    );
  ELSE
    UPDATE public.withdraw_requests 
    SET status = 'rejected', reviewed_by = p_admin_id, reviewed_at = now(), rejection_reason = p_reason
    WHERE id = p_withdraw_id;
    
    INSERT INTO public.user_notifications (user_id, title, message, type)
    VALUES (v_req.user_id, 'Saque Rejeitado ❌', 'Sua solicitação de saque foi rejeitada. Motivo: ' || COALESCE(p_reason, 'Não informado'), 'error');
  END IF;
END;
$$;

-- 6. SINCRONIA PIX AUTOMÁTICO (Mercado Pago Trigger)
CREATE OR REPLACE FUNCTION public.process_deposit_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF (COALESCE(OLD.status, 'pending') != 'approved' AND NEW.status = 'approved') THEN
        PERFORM public.credit_user_balance(
            NEW.user_id, NEW.amount, 'deposit', 'balance', 
            'Depósito via PIX Automático confirmado.',
            NEW.id, NEW.user_id
        );

        -- Alerta PWA para Admin
        PERFORM public.trigger_pwa_push(
            p_title := '💰 Depósito Automático!',
            p_body := 'Novo depósito de R$ ' || NEW.amount::text || ' confirmado via PIX.',
            p_target := 'admins', p_url := '/admin'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. AJUSTE MANUAL ADMIN (REFORMULADO)
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
    p_user_id uuid,
    p_new_amount numeric,
    p_balance_type text, -- 'balance' (Jogo) or 'withdrawable' (Saque)
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
BEGIN
    -- A. Verify Admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    -- B. Get Current State
    IF p_balance_type = 'withdrawable' THEN
        SELECT COALESCE(withdrawable_balance, 0) INTO v_current_amount FROM profiles WHERE id = p_user_id;
    ELSE
        SELECT COALESCE(balance, 0) INTO v_current_amount FROM profiles WHERE id = p_user_id;
    END IF;

    -- C. Calculate
    v_delta := p_new_amount - v_current_amount;

    IF v_delta > 0 THEN
        PERFORM public.credit_user_balance(p_user_id, v_delta, 'adjustment', p_balance_type, p_reason, null, p_admin_id);
    ELSIF v_delta < 0 THEN
        PERFORM public.deduct_user_balance(p_user_id, abs(v_delta), 'adjustment', p_balance_type, p_reason, null, p_admin_id);
    END IF;

    RETURN json_build_object('success', true, 'delta', v_delta);
END;
$$;

-- 8. COMPATIBILIDADE EDGE FUNCTIONS (Legacy helper)
CREATE OR REPLACE FUNCTION public.deduct_balance(p_user_id uuid, p_amount numeric, p_balance_type text)
RETURNS void AS $$
BEGIN
    PERFORM public.deduct_user_balance(p_user_id, p_amount, 'withdraw', p_balance_type, 'Operação via Sistema');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
