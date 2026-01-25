-- DIAGNOSTICO COMPLETO: APAGÃO DE NOTIFICAÇÕES E ERRO DE UPDATE

-- 1. Ver o código EXATO que está rodando na função de excluir
-- Queremos ter certeza que o INSERT INTO user_notifications está lá
select prosrc from pg_proc where proname = 'delete_pool_with_refund';

-- 2. Ver se as permissões de UPDATE na tabela de APOSTAS (bets) estão corretas
select * from pg_policies where tablename = 'bets';

-- 3. Espiar as últimas 5 notificações criadas (para ver se o sistema tentou)
select id, created_at, title, user_id from user_notifications order by created_at desc limit 5;
