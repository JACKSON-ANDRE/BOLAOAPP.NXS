-- 🔍 Auditoria Completa do Sistema de Push
-- 1. Contagem de Inscrições Ativas
SELECT 'Total de Inscrições' as Metrica, count(*) as Valor FROM user_push_subscriptions
UNION ALL
-- 2. Verificar se as Chaves VAPID no Banco Batem com o Par Gerado
SELECT 'VAPID Public Key (Banco)', vapid_public_key FROM app_settings WHERE id = 1
UNION ALL
-- 3. Lista de IDs que tem push ativo (Para saber se o amigo está lá)
SELECT 'User ID Ativo', user_id::text FROM user_push_subscriptions LIMIT 10;

-- 4. Ver logs detalhados de requisições de rede do Supabase
SELECT created_at, method, path, status, response_body
FROM net.http_requests
WHERE path LIKE '%send-push%'
ORDER BY created_at DESC
LIMIT 5;
