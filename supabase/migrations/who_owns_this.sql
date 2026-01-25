-- DIAGNÓSTICO FINAL: QUEM É O DONO DESSA NOTIFICAÇÃO?
-- Vamos descobrir se o ID do usuário que recebe a notificação é o mesmo que está logado.

-- 1. Mostra seu usuário ATUAL (Logado)
select auth.uid() as "SEU_ID_LOGADO";

-- 2. Mostra as últimas 5 notificações criadas no sistema INTEIRO (sem filtro)
-- Se aparecer aqui e não no app, é 100% erro de ID ou RLS.
select 
    id, 
    user_id as "QUEM_RECEBEU", 
    created_at, 
    message,
    (user_id = auth.uid()) as "É_PRA_MIM?"
from user_notifications 
order by created_at desc 
limit 5;

-- 3. Verifica se a política de leitura está ativa
select * from pg_policies where tablename = 'user_notifications';
