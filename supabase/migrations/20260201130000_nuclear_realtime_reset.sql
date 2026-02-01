-- 💥 NUCLEAR REALTIME RESET
-- Este script limpa e reconstrói o motor de tempo real do Supabase
-- para garantir que mensagens, notificações e estados financeiros sincronizem instantaneamente.

-- 1. Reset da Publicação
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

-- 2. Adicionar Tabelas Vitais à Publicação
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdraw_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pools;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bets;

-- 3. Configurar REPLICA IDENTITY FULL
-- Isso é CRÍTICO: faz com que o PostgreSQL envie o conteúdo completo da linha em cada evento,
-- permitindo que o frontend filtre e atualize a UI sem depender do Supabase Proxy adivinhar campos.
ALTER TABLE public.user_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.admin_messages REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.deposit_requests REPLICA IDENTITY FULL;
ALTER TABLE public.withdraw_requests REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.pools REPLICA IDENTITY FULL;
ALTER TABLE public.bets REPLICA IDENTITY FULL;

-- 4. Garantir permissões de Realtime para as roles
-- O usuário 'authenticated' e 'anon' precisam conseguir ler a publicação via Realtime
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated, anon;

-- 5. Comentário de Sucesso
COMMENT ON TABLE public.admin_messages IS 'Sincronismo Realtime RESTAURADO - Nuclear Reset 2026-02-01';
