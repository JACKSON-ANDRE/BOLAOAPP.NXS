-- 🔌 SISTEMA DE DESPACHO DE PUSH (BYPASS CORS)
-- Este sistema permite que o admin envie notificações globais sem erros de CORS no navegador.

-- 1. Tabela de Despachos
CREATE TABLE IF NOT EXISTS public.admin_push_dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    url TEXT DEFAULT '/',
    broadcast BOOLEAN DEFAULT TRUE,
    target_user_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending', -- pending, sent, error
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.admin_push_dispatches ENABLE ROW LEVEL SECURITY;

-- Política: Apenas Admins podem ver/inserir
CREATE POLICY "Admins can manage push dispatches" ON public.admin_push_dispatches
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 2. Função de Trigger para Disparar a Edge Function
CREATE OR REPLACE FUNCTION public.trigger_push_dispatch()
RETURNS TRIGGER AS $$
DECLARE
    v_supabase_url TEXT;
    v_service_key TEXT;
BEGIN
    -- Pegar as configurações do app_settings
    SELECT supabase_url, service_role_key 
    INTO v_supabase_url, v_service_key
    FROM public.app_settings 
    WHERE id = 1;

    -- Disparar para a Edge Function
    PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-push',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object(
            'title', NEW.title,
            'body', NEW.body,
            'url', NEW.url,
            'broadcast', NEW.broadcast,
            'user_id', NEW.target_user_id
        )
    );

    -- Atualizar status para sent
    UPDATE public.admin_push_dispatches 
    SET status = 'sent', sent_at = now() 
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar o Trigger
DROP TRIGGER IF EXISTS tr_on_push_dispatch ON public.admin_push_dispatches;
CREATE TRIGGER tr_on_push_dispatch
AFTER INSERT ON public.admin_push_dispatches
FOR EACH ROW EXECUTE FUNCTION public.trigger_push_dispatch();

COMMENT ON TABLE public.admin_push_dispatches IS 'Fila de disparos manuais de push para evitar erros de CORS no admin.';
