-- CHECK LAST NOTIFICATIONS
-- Verifique se as notificações foram criadas no banco de dados

SELECT 
    un.id,
    un.created_at,
    p.email as user_email,
    un.title,
    un.message
FROM user_notifications un
JOIN profiles p ON p.id = un.user_id
ORDER BY un.created_at DESC
LIMIT 10;
