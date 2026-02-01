-- 🚨 RECOVERY: NOTIFICATION SYSTEM MASTER 🚨
-- Este script corrige a estrutura e re-ativa TODOS os avisos para Admin.

-- 1. CORRIGE ESTRUTURA (Adiciona 'title' se estiver faltando)
-- RECOVERY NOTIFICATIONS MASTER
-- 1. Tabela de Notificações (Garante Colunas e Realtime)
ALTER TABLE public.user_notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.user_notifications REPLICA IDENTITY FULL;

-- Garante que a tabela está na publicação do Realtime
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'user_notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
    END IF;
END $$;

-- 2. A FUNÇÃO MESTRA DE NOTIFICAÇÃO
CREATE OR REPLACE FUNCTION public.notify_admins_of_event()
RETURNS trigger AS $$
DECLARE
    v_title text;
    v_body text;
    v_admin_id uuid;
BEGIN
    -- [🛡️] Proteção contra recursão
    IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;

    -- Define o conteúdo baseado na tabela e ação
    IF TG_TABLE_NAME = 'profiles' THEN
        v_title := 'Novo Cadastro! 👤';
        v_body := COALESCE(NEW.full_name, 'Novo Membro') || ' acaba de entrar para a comunidade.';
    ELSIF TG_TABLE_NAME = 'deposit_requests' AND NEW.status = 'pending' THEN
        v_title := 'Novo Depósito! 💰';
        v_body := 'Solicitação de R$ ' || NEW.amount::text || ' aguarda aprovação.';
    ELSIF TG_TABLE_NAME = 'withdraw_requests' AND NEW.status = 'pending' THEN
        v_title := 'Novo Saque! 💸';
        v_body := 'Solicitação de R$ ' || NEW.amount::text || ' aguarda aprovação.';
    ELSE
        RETURN NEW;
    END IF;

    -- A. NOTIFICAÇÃO INTERNA (Sininho no Dashboard)
    FOR v_admin_id IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
        INSERT INTO public.user_notifications (user_id, title, message, type)
        VALUES (v_admin_id, v_title, v_body, 'info');
    END LOOP;

    -- B. PUSH PWA (Notificação externa)
    PERFORM public.trigger_pwa_push(
        p_title := v_title,
        p_body := v_body,
        p_target := 'admins',
        p_url := '/admin'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RE-ANEXA OS GATILHOS (TRIGGERS)
DROP TRIGGER IF EXISTS tr_admin_notify_on_signup ON public.profiles;
CREATE TRIGGER tr_admin_notify_on_signup
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.notify_admins_of_event();

DROP TRIGGER IF EXISTS tr_admin_notify_on_deposit ON public.deposit_requests;
CREATE TRIGGER tr_admin_notify_on_deposit
    AFTER INSERT OR UPDATE ON public.deposit_requests
    FOR EACH ROW EXECUTE FUNCTION public.notify_admins_of_event();

DROP TRIGGER IF EXISTS tr_admin_notify_on_withdraw ON public.withdraw_requests;
CREATE TRIGGER tr_admin_notify_on_withdraw
    AFTER INSERT OR UPDATE ON public.withdraw_requests
    FOR EACH ROW EXECUTE FUNCTION public.notify_admins_of_event();

-- 4. PONTE DE PUSH PARA NOTIFICAÇÕES GERAIS
CREATE OR REPLACE FUNCTION public.on_new_notification_send_push()
RETURNS trigger AS $$
BEGIN
    PERFORM public.trigger_pwa_push(
        p_user_id := NEW.user_id,
        p_title := COALESCE(NEW.title, 'Novo Aviso 🔔'),
        p_body := NEW.message,
        p_url := '/'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_push_on_notification ON public.user_notifications;
CREATE TRIGGER tr_push_on_notification
    AFTER INSERT ON public.user_notifications
    FOR EACH ROW EXECUTE FUNCTION public.on_new_notification_send_push();
-- 5. MENSAGENS ADMINISTRATIVAS (Fan-out para notificações)
CREATE OR REPLACE FUNCTION public.handle_new_admin_message()
RETURNS trigger AS $$
BEGIN
    IF NEW.target_user_id IS NOT NULL THEN
        -- Mensagem Direta
        INSERT INTO public.user_notifications (user_id, title, message, type)
        VALUES (NEW.target_user_id, 'Mensagem Administrativa', NEW.message, 'info');
    ELSE
        -- Mensagem Global (Para todos)
        INSERT INTO public.user_notifications (user_id, title, message, type)
        SELECT id, 'Aviso Geral 📢', NEW.message, 'info'
        FROM public.profiles;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_dispatch_admin_message ON public.admin_messages;
CREATE TRIGGER tr_dispatch_admin_message
    AFTER INSERT ON public.admin_messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin_message();

-- 6. SINCRONIA DE EXCLUSÃO (Para o sininho sumir na hora)
CREATE OR REPLACE FUNCTION public.handle_admin_message_delete()
RETURNS trigger AS $$
BEGIN
    -- Se apagarmos a mensagem admin, apagamos as notificações geradas por ela
    -- Buscamos pelo conteúdo da mensagem (como as notificações não tem FK, usamos o conteúdo)
    DELETE FROM public.user_notifications 
    WHERE message = OLD.message;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_admin_message_deleted ON public.admin_messages;
CREATE TRIGGER tr_admin_message_deleted
    BEFORE DELETE ON public.admin_messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_admin_message_delete();
