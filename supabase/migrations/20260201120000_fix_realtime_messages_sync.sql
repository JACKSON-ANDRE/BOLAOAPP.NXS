-- 🛰️ FIX REALTIME MESSAGES SYNC
-- Este script garante que mensagens e notificações sejam entregues instantaneamente.

-- 1. Garantir que as tabelas estejam na publicação do Realtime
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

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'admin_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;
    END IF;
END $$;

-- 2. Configurar REPLICA IDENTITY para garantir que todos os dados sejam enviados no payload
-- Isso é vital para que filtros e atualizações de UI funcionem sem erros.
ALTER TABLE public.user_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.admin_messages REPLICA IDENTITY FULL;

-- 3. Comentário de Auditoria
COMMENT ON TABLE public.admin_messages IS 'Mensagens administrativas com suporte a Realtime FULL.';
COMMENT ON TABLE public.user_notifications IS 'Notificações de usuário com suporte a Realtime FULL.';
