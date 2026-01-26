-- 1. Melhorar a captura do Title no Push disparado por Notificações Internas
CREATE OR REPLACE FUNCTION public.on_new_notification_send_push()
RETURNS trigger AS $$
BEGIN
    PERFORM public.trigger_pwa_push(
        p_user_id := NEW.user_id,
        p_title := COALESCE(NEW.title, 'Novo Aviso 🔔'), -- Usa o título da tabela se existir
        p_body := NEW.message,
        p_url := '/'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualizar Trigger de Eventos Admin para gerar Notificações Internas (Sininho)
-- Essas notificações serão criadas apenas para usuários com role = 'admin'
CREATE OR REPLACE FUNCTION public.on_admin_event_send_push()
RETURNS trigger AS $$
DECLARE
    v_title text;
    v_body text;
    v_admin_id uuid;
BEGIN
    -- Definir Conteúdo baseado na tabela (Templates específicos solicitados pelo usuário)
    IF TG_TABLE_NAME = 'profiles' THEN
        v_title := 'Novo Cadastro! 👤';
        v_body := COALESCE(NEW.full_name, 'Novo Membro') || ' acaba de entrar para a comunidade.';
    ELSIF TG_TABLE_NAME = 'deposit_requests' THEN
        v_title := 'Novo Depósito! 💰';
        v_body := 'Você acaba de receber uma solicitação de depósito no valor de R$ ' || NEW.amount::text || '.';
    ELSIF TG_TABLE_NAME = 'withdraw_requests' THEN
        v_title := 'Novo Saque! 💸';
        v_body := 'Você acaba de receber uma solicitação de saque no valor de R$ ' || NEW.amount::text || '.';
    END IF;

    -- Gerar Notificação Interna para TODOS os Admins
    -- O gatilho 'tr_push_on_notification' cuidará de disparar o Push PWA automaticamente
    FOR v_admin_id IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
        INSERT INTO public.user_notifications (user_id, title, message, type)
        VALUES (v_admin_id, v_title, v_body, 'info');
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
