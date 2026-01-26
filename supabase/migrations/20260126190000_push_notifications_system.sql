-- 1. Habilitar extensões necessárias (se não existirem)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Garantir que as colunas de configuração existam em app_settings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'supabase_url') THEN
        ALTER TABLE public.app_settings ADD COLUMN supabase_url text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'service_role_key') THEN
        ALTER TABLE public.app_settings ADD COLUMN service_role_key text;
    END IF;
END $$;

-- 3. Função de disparo de Push (Genérica)
-- Esta função chama a Edge Function 'send-push' via net.http_post
CREATE OR REPLACE FUNCTION public.trigger_pwa_push(
    p_user_id uuid DEFAULT NULL,
    p_title text DEFAULT 'Bolão App',
    p_body text DEFAULT 'Nova notificação!',
    p_url text DEFAULT '/',
    p_target text DEFAULT NULL -- 'admins' or NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_supabase_url text;
    v_service_role_key text;
    v_payload jsonb;
BEGIN
    -- NOTA: Como não podemos acessar ENV diretamente no SQL de forma segura sem vault,
    -- buscamos das app_settings. O usuário deve configurar isso uma vez no painel.
    SELECT supabase_url, service_role_key INTO v_supabase_url, v_service_role_key 
    FROM public.app_settings 
    LIMIT 1;

    -- Se não houver config, cancelamos silenciosamente para não quebrar o banco
    IF v_supabase_url IS NULL OR v_service_role_key IS NULL OR v_supabase_url = '' OR v_supabase_url = 'SUPABASE_URL' THEN
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'title', p_title,
        'body', p_body,
        'url', p_url
    );

    IF p_user_id IS NOT NULL THEN
        v_payload := v_payload || jsonb_build_object('user_id', p_user_id);
    END IF;

    IF p_target IS NOT NULL THEN
        v_payload := v_payload || jsonb_build_object('target', p_target);
    END IF;

    -- Disparo Assíncrono via pg_net
    PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-push',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_role_key
        ),
        body := v_payload
    );
END;
$$;

-- 3. Trigger para transformar NOTIFICAÇÕES INTERNAS em PUSH
-- Sempre que uma linha for inserida em user_notifications, enviamos um Push!
CREATE OR REPLACE FUNCTION public.on_new_notification_send_push()
RETURNS trigger AS $$
BEGIN
    PERFORM public.trigger_pwa_push(
        p_user_id := NEW.user_id,
        p_title := 'Novo Aviso 🔔',
        p_body := NEW.message,
        p_url := '/'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_push_on_notification ON public.user_notifications;
CREATE TRIGGER tr_push_on_notification
    AFTER INSERT ON public.user_notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.on_new_notification_send_push();


-- 4. Função para Eventos Administrativos (Depósitos/Saques/Novos Users)
CREATE OR REPLACE FUNCTION public.on_admin_event_send_push()
RETURNS trigger AS $$
DECLARE
    v_title text;
    v_body text;
BEGIN
    IF TG_TABLE_NAME = 'profiles' THEN
        v_title := 'Novo Cadastro! 👤';
        v_body := 'O usuário ' || COALESCE(NEW.full_name, 'Novo Membro') || ' acabou de entrar.';
    ELSIF TG_TABLE_NAME = 'deposit_requests' THEN
        v_title := 'Depósito Pendente! 💰';
        v_body := 'Nova solicitação de R$ ' || NEW.amount::text || '. Verifique o comprovante.';
    ELSIF TG_TABLE_NAME = 'withdraw_requests' THEN
        v_title := 'Pedido de Saque! 💸';
        v_body := 'Um usuário solicitou R$ ' || NEW.amount::text || '. Pendente de aprovação.';
    END IF;

    PERFORM public.trigger_pwa_push(
        p_title := v_title,
        p_body := v_body,
        p_target := 'admins',
        p_url := '/admin'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers Admin
DROP TRIGGER IF EXISTS tr_admin_push_on_profile ON public.profiles;
CREATE TRIGGER tr_admin_push_on_profile
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.on_admin_event_send_push();

DROP TRIGGER IF EXISTS tr_admin_push_on_deposit ON public.deposit_requests;
CREATE TRIGGER tr_admin_push_on_deposit
    AFTER INSERT ON public.deposit_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.on_admin_event_send_push();

DROP TRIGGER IF EXISTS tr_admin_push_on_withdraw ON public.withdraw_requests;
CREATE TRIGGER tr_admin_push_on_withdraw
    AFTER INSERT ON public.withdraw_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.on_admin_event_send_push();
