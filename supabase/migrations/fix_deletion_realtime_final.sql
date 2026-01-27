-- FIX REALTIME DELETION & SYNC
-- 1. Garantir que o Realtime consiga filtrar DELETES
-- Por padrão, o Postgres não envia todos os campos no DELETE, o que quebra o filtro "user_id=eq.X"
ALTER TABLE public.user_notifications REPLICA IDENTITY FULL;

-- 2. Garantir o Gatilho de Sincronização de Exclusão (Admin -> Usuário)
-- Se o Admin apaga a mensagem "pai", as notificações "filhas" no sininho dos usuários devem sumir também.
CREATE OR REPLACE FUNCTION public.handle_admin_message_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Remove as notificações baseadas no texto e no target (ou todas se for global)
    IF OLD.target_user_id IS NOT NULL THEN
        DELETE FROM public.user_notifications 
        WHERE user_id = OLD.target_user_id 
        AND message = OLD.message;
    ELSE
        DELETE FROM public.user_notifications 
        WHERE message = OLD.message;
    END IF;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_admin_message_deleted ON public.admin_messages;
CREATE TRIGGER on_admin_message_deleted
    AFTER DELETE ON public.admin_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_admin_message_delete();

-- 3. Habilita Realtime para as tabelas envolvidas (reforço)
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
