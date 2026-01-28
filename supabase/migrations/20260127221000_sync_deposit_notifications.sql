-- 1. Sincronizar Notificações de Depósito Automático (Aprovado)
-- Sempre que um depósito automático for aprovado, notificamos o usuário e o administrador.

CREATE OR REPLACE FUNCTION public.process_deposit_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name text;
BEGIN
    -- Só disparar quando o status mudar para 'approved'
    IF (OLD.status != 'approved' AND NEW.status = 'approved') THEN
        
        -- 1. Notificar Usuário (Interno + Push via Trigger de user_notifications)
        INSERT INTO public.user_notifications (user_id, message)
        VALUES (
            NEW.user_id,
            '✅ Seu depósito de R$ ' || NEW.amount::text || ' via PIX foi confirmado!'
        );

        -- 2. Buscar nome do usuário para o Admin
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;

        -- 3. Notificar Administradores (Push)
        PERFORM public.trigger_pwa_push(
            p_title := '💰 Depósito Confirmado!',
            p_body := 'O usuário ' || v_user_name || ' acabou de depositar R$ ' || NEW.amount::text || ' via PIX Automático.',
            p_target := 'admins',
            p_url := '/admin'
        );

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar Gatilho na tabela deposits
DROP TRIGGER IF EXISTS tr_notify_on_deposit_approved ON public.deposits;
CREATE TRIGGER tr_notify_on_deposit_approved
    AFTER UPDATE ON public.deposits
    FOR EACH ROW
    EXECUTE FUNCTION public.process_deposit_notification();

-- 2. Garantir que Saques Notificam o Usuário ao serem Aprovados
-- O AdminDashboard já faz isso via `process_withdraw_request` RPC, 
-- mas vamos garantir que se mudar direto no banco (ou via trigger) também funcione.

CREATE OR REPLACE FUNCTION public.on_withdraw_status_change_notify()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status != NEW.status) THEN
        IF (NEW.status = 'approved') THEN
            INSERT INTO public.user_notifications (user_id, message)
            VALUES (NEW.user_id, '💸 Seu saque de R$ ' || NEW.amount::text || ' foi aprovado e enviado!');
        ELSIF (NEW.status = 'rejected') THEN
             INSERT INTO public.user_notifications (user_id, message)
            VALUES (NEW.user_id, '❌ Seu pedido de saque de R$ ' || NEW.amount::text || ' foi recusado.');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_withdraw_status ON public.withdraw_requests;
CREATE TRIGGER tr_notify_withdraw_status
    AFTER UPDATE ON public.withdraw_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.on_withdraw_status_change_notify();
