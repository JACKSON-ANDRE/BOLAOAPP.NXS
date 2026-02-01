-- 🚀 NOTIFICAÇÕES UNIFICADAS DE DEPÓSITO 🚀
-- Este script garante que Admins e Usuários sejam notificados em tempo real.

-- 1. Função auxiliar para notificar todos os administradores
CREATE OR REPLACE FUNCTION public.notify_all_admins(p_message text, p_type text DEFAULT 'info')
RETURNS void AS $$
BEGIN
    INSERT INTO public.user_notifications (user_id, message, type)
    SELECT id, p_message, p_type
    FROM public.profiles
    WHERE role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualização do Gatilho de PIX Automático (deposits table)
CREATE OR REPLACE FUNCTION public.process_deposit_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name text;
BEGIN
    -- Log para debug
    RAISE NOTICE 'Trigger process_deposit_notification disparado para ID % (Status OLD: %, Status NEW: %)', 
                 NEW.id, COALESCE(OLD.status, 'N/A'), NEW.status;

    -- A. CASO: APROVADO (Sucesso)
    IF (COALESCE(OLD.status, 'pending') != 'approved' AND NEW.status = 'approved') THEN
        
        -- Crédito no Saldo
        UPDATE public.profiles
        SET balance = COALESCE(balance, 0) + COALESCE(NEW.amount, 0)
        WHERE id = NEW.user_id;

        -- Registro de Transação
        INSERT INTO public.transactions (user_id, amount, type, status, reference_id, created_by, balance_type, description)
        VALUES (NEW.user_id, NEW.amount, 'deposit', 'approved', NEW.id, NEW.user_id, 'balance', 'Depósito via PIX Automático (Confirmado)');

        -- Notifica o Usuário
        INSERT INTO public.user_notifications (user_id, message, type)
        VALUES (NEW.user_id, '✅ Seu depósito de R$ ' || NEW.amount::text || ' via PIX foi confirmado!', 'success');

        -- Notifica os Administradores (Sininho)
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        PERFORM public.notify_all_admins(
            '💰 Depósito Confirmado! O usuário ' || COALESCE(v_user_name, 'Usuário') || ' depositou R$ ' || NEW.amount::text || ' via PIX Automático.',
            'success'
        );

        -- Push PWA para Admins (Mantendo funcionalidade existente)
        PERFORM public.trigger_pwa_push(
            p_title := '💰 Depósito Confirmado!',
            p_body := 'O usuário ' || COALESCE(v_user_name, 'Usuário') || ' depositou R$ ' || NEW.amount::text || ' via PIX Automático.',
            p_target := 'admins', 
            p_url := '/admin'
        );

    -- B. CASO: REJEITADO OU EXPIRADO (Falha/Cancelamento)
    ELSIF (COALESCE(OLD.status, 'pending') != NEW.status AND NEW.status IN ('rejected', 'expired')) THEN
        
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;

        -- Notifica o Usuário sobre a falha
        INSERT INTO public.user_notifications (user_id, message, type)
        VALUES (
            NEW.user_id, 
            CASE 
                WHEN NEW.status = 'expired' THEN '❌ Seu QR Code de depósito expirou ou foi fechado.'
                ELSE '❌ Seu depósito de R$ ' || NEW.amount::text || ' foi rejeitado.'
            END,
            'error'
        );

        -- Notifica os Administradores sobre a falha
        PERFORM public.notify_all_admins(
            CASE 
                WHEN NEW.status = 'expired' THEN 'ℹ️ O PIX de ' || COALESCE(v_user_name, 'Usuário') || ' (R$ ' || NEW.amount::text || ') expirou ou foi fechado.'
                ELSE '⚠️ O PIX automático de ' || COALESCE(v_user_name, 'Usuário') || ' (R$ ' || NEW.amount::text || ') foi REJEITADO.'
            END,
            'warning'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atualização da RPC de Depósito Manual (deposit_requests)
CREATE OR REPLACE FUNCTION public.process_deposit_request(
  p_deposit_request_id uuid,
  p_admin_id uuid,
  p_action text,
  p_reason text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit_request record;
  v_new_status text;
  v_user_name text;
BEGIN
  IF p_action = 'approve' THEN v_new_status := 'approved';
  ELSIF p_action = 'reject' THEN v_new_status := 'rejected';
  ELSE RAISE EXCEPTION 'Invalid action.'; END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  SELECT * INTO v_deposit_request FROM deposit_requests WHERE id = p_deposit_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Requisição não encontrada.'; END IF;
  IF v_deposit_request.status != 'pending' THEN RAISE EXCEPTION 'Já processada.'; END IF;

  UPDATE deposit_requests SET status = v_new_status, updated_at = now() WHERE id = p_deposit_request_id;

  -- Notifica Usuário
  INSERT INTO user_notifications (user_id, message, created_at, type)
  VALUES (
    v_deposit_request.user_id,
    CASE WHEN p_action = 'approve' THEN 'Seu depósito de R$ ' || v_deposit_request.amount || ' foi aprovado!'
    ELSE 'Seu depósito foi rejeitado. Motivo: ' || COALESCE(p_reason, 'Não informado') END,
    now(),
    CASE WHEN p_action = 'approve' THEN 'success' ELSE 'error' END
  );

  -- Notifica Admins (Sininho) no caso de Aprovação
  IF p_action = 'approve' THEN
    SELECT full_name INTO v_user_name FROM profiles WHERE id = v_deposit_request.user_id;
    PERFORM public.notify_all_admins(
        '💰 Depósito MANUAL Confirmado! O usuário ' || COALESCE(v_user_name, 'Usuário') || ' depositou R$ ' || v_deposit_request.amount::text,
        'success'
    );

    UPDATE public.profiles SET balance = balance + v_deposit_request.amount WHERE id = v_deposit_request.user_id;

    INSERT INTO transactions (user_id, amount, type, status, reference_id, created_by, balance_type, created_at)
    VALUES (v_deposit_request.user_id, v_deposit_request.amount, 'deposit', 'approved', p_deposit_request_id, p_admin_id, 'balance', now());
    -- Push Notification para o Celular
    PERFORM public.trigger_pwa_push(
        p_user_id := v_deposit_request.user_id,
        p_title := 'Depósito Aprovado! 💰',
        p_body := 'Seu depósito de R$ ' || v_deposit_request.amount || ' foi confirmado manualmente.',
        p_url := '/wallet'
    );

  END IF;
END;
$$;
