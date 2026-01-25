-- INSPECT DUPLICATES
SELECT * FROM public.user_notifications 
ORDER BY created_at DESC 
LIMIT 20;

-- INSPECT TRIGGERS AGAIN
SELECT event_object_table, trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'admin_messages';
