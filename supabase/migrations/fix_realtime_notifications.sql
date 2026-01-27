-- FIX REALTIME & DUPLICIDADE
-- 1. Habilitar Realtime para as tabelas necessárias
-- O Supabase exige que a tabela esteja no conjunto de publicação 'supabase_realtime'

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
-- Se já existir, o comando acima pode falhar silenciosamente ou dar erro. 
-- Uma forma mais segura:
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'user_notifications'
  ) then
    alter publication supabase_realtime add table public.user_notifications;
  end if;
end $$;

-- 2. Corrigir Duplicidade nos Triggers
-- Vamos DROPAR todos os nomes conhecidos de triggers que criamos nas migrations anteriores
-- para garantir que não haja disparos duplicados.

DROP TRIGGER IF EXISTS tr_dispatch_admin_message ON public.admin_messages;
DROP TRIGGER IF EXISTS on_admin_message_created ON public.admin_messages; 
DROP TRIGGER IF EXISTS trigger_admin_notification ON public.admin_messages;
DROP TRIGGER IF EXISTS admin_msg_trigger ON public.admin_messages;
DROP TRIGGER IF EXISTS send_notifications_trigger ON public.admin_messages;
DROP TRIGGER IF EXISTS tr_admin_messages_fanout ON public.admin_messages;

-- Criar o trigger ÚNICO e DEFINITIVO
CREATE TRIGGER tr_dispatch_admin_message
    AFTER INSERT ON public.admin_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_admin_message();

-- 3. Limpar notificações duplicadas (Opcional, mas bom para o usuário)
-- Remove linhas idênticas mantendo apenas a mais recente em um intervalo curto
-- (Se duas mensagens iguais foram criadas no mesmo segundo para o mesmo usuário)
DELETE FROM public.user_notifications n1
USING public.user_notifications n2
WHERE n1.id < n2.id
  AND n1.user_id = n2.user_id
  AND n1.message = n2.message
  AND n1.created_at >= (now() - interval '10 minutes')
  AND n1.created_at = n2.created_at;
