-- 🚨 ULTIMATE FINANCIAL & NOTIFICATION CONSOLIDATION 🚨
-- [🎯] Objetivo: Unificar avisos (Sininho + Push) e limpar gatilhos redundantes.

-- 1. LIMPEZA TOTAL (Remover o que pode estar causando conflito ou lerdeza)
DROP TRIGGER IF EXISTS tr_admin_notify_on_signup ON public.profiles;
DROP TRIGGER IF EXISTS tr_admin_notify_on_deposit ON public.deposit_requests;
DROP TRIGGER IF EXISTS tr_admin_notify_on_withdraw ON public.withdraw_requests;
DROP TRIGGER IF EXISTS tr_notify_on_deposit_approved ON public.deposits;
DROP TRIGGER IF EXISTS on_deposit_approved ON public.deposits;

-- 2. FUNÇÃO MESTRA DE NOTIFICAÇÃO PARA ADMINS
CREATE OR REPLACE FUNCTION public.notify_all_admins(
    p_title text, 
    p_message text, 
    p_type text DEFAULT 'info',
    p_url text DEFAULT '/admin'
)
RETURNS void AS $$
DECLARE
    v_admin_id uuid;
BEGIN
    -- A. Inserir no Banco (Para o Sininho/Bell)
    FOR v_admin_id IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
        INSERT INTO public.user_notifications (user_id, title, message, type)
        VALUES (v_admin_id, p_title, p_message, p_type);
    END LOOP;

    -- B. Disparar PWA Push
    PERFORM public.trigger_pwa_push(
        p_title := p_title,
        p_body := p_message,
        p_target := 'admins',
        p_url := p_url
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. GATILHO PARA TABELA 'DEPOSITS' (Pix Automático)
CREATE OR REPLACE FUNCTION public.process_deposit_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name text;
BEGIN
    -- Só age na mudança para 'approved'
    IF (COALESCE(OLD.status, 'pending') != 'approved' AND NEW.status = 'approved') THEN
        
        -- A. Crédito via Função Mestre (Se já não foi feito por outro trigger)
        -- Nota: O script FINANCIAL_CONSOLIDATION_MASTER já lida com o crédito.
        -- Aqui focamos APENAS na notificação se o crédito foi bem sucedido.
        
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        
        PERFORM public.notify_all_admins(
            '💰 Depósito Confirmado!',
            'O usuário ' || COALESCE(v_user_name, 'Usuário') || ' depositou R$ ' || NEW.amount::text || ' via PIX Automático.',
            'success'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_notify_on_deposit_approved
    AFTER UPDATE ON public.deposits
    FOR EACH ROW EXECUTE FUNCTION public.process_deposit_notification();

-- 4. GATILHO UNIFICADO PARA EVENTOS ESTRUTURAIS (Cadastro, Pedidos Manuais)
CREATE OR REPLACE FUNCTION public.notify_admins_of_event()
RETURNS trigger AS $$
DECLARE
    v_title text;
    v_body text;
BEGIN
    IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;

    IF TG_TABLE_NAME = 'profiles' THEN
        v_title := 'Novo Cadastro! 👤';
        v_body := COALESCE(NEW.full_name, 'Novo Membro') || ' acaba de entrar para a comunidade.';
    ELSIF TG_TABLE_NAME = 'deposit_requests' AND NEW.status = 'pending' THEN
        v_title := 'Novo Depósito Manual! 💰';
        v_body := 'Solicitação de R$ ' || NEW.amount::text || ' aguarda aprovação.';
    ELSIF TG_TABLE_NAME = 'withdraw_requests' AND NEW.status = 'pending' THEN
        v_title := 'Novo Saque! 💸';
        v_body := 'Solicitação de R$ ' || NEW.amount::text || ' aguarda aprovação.';
    ELSE
        RETURN NEW;
    END IF;

    PERFORM public.notify_all_admins(v_title, v_body, 'info');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_admin_notify_on_signup
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.notify_admins_of_event();

CREATE TRIGGER tr_admin_notify_on_deposit
    AFTER INSERT ON public.deposit_requests
    FOR EACH ROW EXECUTE FUNCTION public.notify_admins_of_event();

CREATE TRIGGER tr_admin_notify_on_withdraw
    AFTER INSERT ON public.withdraw_requests
    FOR EACH ROW EXECUTE FUNCTION public.notify_admins_of_event();
