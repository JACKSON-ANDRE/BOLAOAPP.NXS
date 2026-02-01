-- 🚀 FIX: Notificações de Novo Cadastro para Administradores
-- Este script garante que o Admin seja avisado (Sininho + Push) quando alguém cria conta.

-- 1. Redefine a função de notificação para ser completa
CREATE OR REPLACE FUNCTION public.notify_admins_of_event()
RETURNS trigger AS $$
DECLARE
    v_title text;
    v_body text;
    v_admin_id uuid;
BEGIN
    -- Define o conteúdo baseado na tabela que disparou
    IF TG_TABLE_NAME = 'profiles' THEN
        v_title := 'Novo Cadastro! 👤';
        v_body := COALESCE(NEW.full_name, 'Novo Membro') || ' acabou de entrar para a comunidade.';
    ELSIF TG_TABLE_NAME = 'deposit_requests' AND NEW.status = 'pending' THEN
        v_title := 'Novo Depósito! 💰';
        v_body := 'Solicitação de R$ ' || NEW.amount::text || ' aguarda aprovação.';
    ELSIF TG_TABLE_NAME = 'withdraw_requests' AND NEW.status = 'pending' THEN
        v_title := 'Novo Saque! 💸';
        v_body := 'Solicitação de R$ ' || NEW.amount::text || ' aguarda aprovação.';
    ELSE
        RETURN NEW;
    END IF;

    -- A. NOTIFICAÇÃO INTERNA (O "Sininho" no Dashboard Admin)
    -- Manda para todos que tem role = 'admin'
    FOR v_admin_id IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
        INSERT INTO public.user_notifications (user_id, title, message, type)
        VALUES (v_admin_id, v_title, v_body, 'info');
    END LOOP;

    -- B. PUSH PWA (Notificação no Celular)
    -- Tenta disparar o Push (depende das configurações do painel estarem preenchidas)
    PERFORM public.trigger_pwa_push(
        p_title := v_title,
        p_body := v_body,
        p_target := 'admins',
        p_url := '/admin'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. (Re)Anexa os Gatilhos (Triggers) às tabelas
-- Novo Usuário
DROP TRIGGER IF EXISTS tr_admin_notify_on_signup ON public.profiles;
CREATE TRIGGER tr_admin_notify_on_signup
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admins_of_event();

-- Depósito
DROP TRIGGER IF EXISTS tr_admin_notify_on_deposit ON public.deposit_requests;
CREATE TRIGGER tr_admin_notify_on_deposit
    AFTER INSERT ON public.deposit_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admins_of_event();

-- Saque
DROP TRIGGER IF EXISTS tr_admin_notify_on_withdraw ON public.withdraw_requests;
CREATE TRIGGER tr_admin_notify_on_withdraw
    AFTER INSERT ON public.withdraw_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admins_of_event();
