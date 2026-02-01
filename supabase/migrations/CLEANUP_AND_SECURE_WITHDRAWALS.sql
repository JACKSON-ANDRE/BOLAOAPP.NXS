-- FINAL CONSOLIDATION: NOTIFICATIONS & WITHDRAWAL SECURITY
-- [🎯] Objetivo 1: Eliminar notificações duplicadas no Admin.
-- [🎯] Objetivo 2: Subtrair saldo NO MOMENTO do pedido de saque (Prevenir gasto duplo).
-- [🎯] Objetivo 3: Devolver saldo se o saque for rejeitado.

-- =============================================================================
-- 1. LIMPEZA DE GATILHOS DUPLICADOS (NOTIFICAÇÕES)
-- =============================================================================

-- Removemos todos os gatilhos antigos para começar do zero (Tabula Rasa)
DROP TRIGGER IF EXISTS tr_admin_notify_on_signup ON public.profiles;
DROP TRIGGER IF EXISTS tr_admin_push_on_profile ON public.profiles;
DROP TRIGGER IF EXISTS tr_admin_notify_on_deposit ON public.deposit_requests;
DROP TRIGGER IF EXISTS tr_admin_push_on_deposit ON public.deposit_requests;
DROP TRIGGER IF EXISTS tr_admin_notify_on_withdraw ON public.withdraw_requests;
DROP TRIGGER IF EXISTS tr_admin_push_on_withdraw ON public.withdraw_requests;
DROP TRIGGER IF EXISTS tr_notify_withdraw_status ON public.withdraw_requests; -- Adicionado para evitar duplicata na rejeição
DROP TRIGGER IF EXISTS tr_push_on_notification ON public.user_notifications;

-- =============================================================================
-- 2. FUNÇÃO MESTRA DE NOTIFICAÇÃO (SININHO)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_admin_events_notification()
RETURNS trigger AS $$
DECLARE
    v_title text;
    v_body text;
    v_admin_id uuid;
BEGIN
    -- [🛡️] Proteção contra recursão
    IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;

    -- Define o conteúdo
    IF TG_TABLE_NAME = 'profiles' THEN
        v_title := 'Novo Cadastro! 👤';
        v_body := COALESCE(NEW.full_name, 'Novo Membro') || ' entrou para o time.';
    ELSIF TG_TABLE_NAME = 'deposit_requests' AND NEW.status = 'pending' THEN
        v_title := 'Novo Depósito! 💰';
        v_body := 'Solicitação de R$ ' || NEW.amount::text || ' aguarda sua análise.';
    ELSIF TG_TABLE_NAME = 'withdraw_requests' AND NEW.status = 'pending' THEN
        v_title := 'Novo Saque! 💸';
        v_body := 'Solicitação de R$ ' || NEW.amount::text || ' aguarda aprovação.';
    ELSE
        RETURN NEW;
    END IF;

    -- Cria notificação apenas no banco (O gatilho de PUSH cuidará do resto)
    FOR v_admin_id IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
        INSERT INTO public.user_notifications (user_id, title, message, type)
        VALUES (v_admin_id, v_title, v_body, 'info');
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-anexamos apenas os gatinhos necessários (INSERT apenas para evitar spam no UPDATE)
DROP TRIGGER IF EXISTS tr_notify_admin_signup ON public.profiles;
CREATE TRIGGER tr_notify_admin_signup AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_admin_events_notification();

DROP TRIGGER IF EXISTS tr_notify_admin_deposit ON public.deposit_requests;
CREATE TRIGGER tr_notify_admin_deposit AFTER INSERT ON public.deposit_requests FOR EACH ROW EXECUTE FUNCTION public.handle_admin_events_notification();

DROP TRIGGER IF EXISTS tr_notify_admin_withdraw ON public.withdraw_requests;
CREATE TRIGGER tr_notify_admin_withdraw AFTER INSERT ON public.withdraw_requests FOR EACH ROW EXECUTE FUNCTION public.handle_admin_events_notification();

-- =============================================================================
-- 3. FUNÇÃO MESTRA DE PUSH EXTERNO (PWA)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.dispatch_pwa_push_notification()
RETURNS trigger AS $$
BEGIN
    -- Envia o push externo sempre que houver uma nova notificação no sininho
    PERFORM public.trigger_pwa_push(
        p_user_id := NEW.user_id,
        p_title := COALESCE(NEW.title, 'Bolão App 🏆'),
        p_body := NEW.message,
        p_url := CASE WHEN (SELECT role FROM profiles WHERE id = NEW.user_id) = 'admin' THEN '/admin' ELSE '/wallet' END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_send_external_push ON public.user_notifications;
CREATE TRIGGER tr_send_external_push AFTER INSERT ON public.user_notifications FOR EACH ROW EXECUTE FUNCTION public.dispatch_pwa_push_notification();

-- =============================================================================
-- 4. SEGURANÇA DE SAQUE: BLOQUEIO IMEDIATO DE SALDO
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_withdraw_request_lock()
RETURNS trigger AS $$
DECLARE
    v_balance numeric;
BEGIN
    -- 1. Verifica saldo atual
    SELECT COALESCE(withdrawable_balance, 0) INTO v_balance FROM public.profiles WHERE id = NEW.user_id;

    IF v_balance < NEW.amount THEN
        RAISE EXCEPTION 'Saldo insuficiente para solicitar este saque.';
    END IF;

    -- 2. Deduz o saldo IMEDIATAMENTE (Bloqueio)
    -- Usamos a função master consolidada se ela existir, senão fazemos o update direto.
    UPDATE public.profiles 
    SET withdrawable_balance = withdrawable_balance - NEW.amount 
    WHERE id = NEW.user_id;

    -- 3. Registra no extrato (Transação Pendente)
    INSERT INTO public.transactions (
        user_id, amount, type, status, reference_id, created_by,
        balance_type, description, balance_before, balance_after, created_at
    )
    VALUES (
        NEW.user_id, NEW.amount, 'withdraw', 'pending', NEW.id, NEW.user_id,
        'withdrawable', 'Saque solicitado (Pendente de análise)', 
        v_balance, v_balance - NEW.amount, now()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_lock_balance_on_withdraw ON public.withdraw_requests;
CREATE TRIGGER tr_lock_balance_on_withdraw
    BEFORE INSERT ON public.withdraw_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_withdraw_request_lock();

-- =============================================================================
-- 5. ATUALIZAÇÃO DO PROCESSAMENTO (REJEIÇÃO = DEVOLUÇÃO)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.process_withdraw_request(
  p_withdraw_id uuid,
  p_admin_id uuid,
  p_action text, -- 'approve' or 'reject'
  p_reason text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req record;
BEGIN
  -- 1. Fetch Request
  SELECT * INTO v_req FROM withdraw_requests WHERE id = p_withdraw_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado.'; END IF;
  IF v_req.status != 'pending' THEN RAISE EXCEPTION 'Já processado.'; END IF;

  -- 2. Process Action
  IF p_action = 'approve' THEN
    -- Apenas confirma o status (Saldo já foi deduzido no Trigger tr_lock_balance_on_withdraw)
    UPDATE withdraw_requests 
    SET status = 'approved', reviewed_by = p_admin_id, reviewed_at = now() 
    WHERE id = p_withdraw_id;

    UPDATE transactions SET status = 'approved', description = 'Saque aprovado e enviado via PIX' WHERE reference_id = p_withdraw_id;
    
    INSERT INTO user_notifications (user_id, title, message, type)
    VALUES (v_req.user_id, 'Saque Aprovado! ✅', 'Seu saque de R$ ' || v_req.amount || ' foi processado! O PIX será enviado para sua chave em instantes.', 'success');

  ELSIF p_action = 'reject' THEN
    -- Rejeita e DEVOLVE o saldo
    UPDATE withdraw_requests 
    SET status = 'rejected', reviewed_by = p_admin_id, reviewed_at = now(), rejection_reason = p_reason
    WHERE id = p_withdraw_id;

    UPDATE public.profiles 
    SET withdrawable_balance = withdrawable_balance + v_req.amount 
    WHERE id = v_req.user_id;

    UPDATE transactions SET status = 'rejected', description = 'Saque rejeitado: ' || COALESCE(p_reason, 'Não informado') WHERE reference_id = p_withdraw_id;

    INSERT INTO user_notifications (user_id, title, message, type)
    VALUES (v_req.user_id, 'Saque Rejeitado ❌', 'Seu saque foi rejeitado e o valor devolvido. Motivo: ' || COALESCE(p_reason, 'Não informado'), 'error');

  END IF;
END;
$$;
