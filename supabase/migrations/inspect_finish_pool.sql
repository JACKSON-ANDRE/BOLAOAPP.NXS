-- 🔍 INSPECT FINISH_POOL DEFINITION
-- Verifica se a lógica de notificação está presente na função ativa.

SELECT prosrc 
FROM pg_proc 
WHERE proname = 'finish_pool';

-- Verifica se existem notificações criadas nos últimos 10 minutos
SELECT * FROM user_notifications 
WHERE created_at > (now() - interval '10 minutes')
ORDER BY created_at DESC;
