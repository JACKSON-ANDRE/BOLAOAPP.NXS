-- INSPECT ALL TABLES AND TRIGGERS RELATED TO MESSAGES
SELECT 
    t.table_name,
    c.column_name,
    c.data_type
FROM information_schema.columns c
JOIN information_schema.tables t ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
AND t.table_name IN ('admin_messages', 'user_notifications')
ORDER BY t.table_name, c.ordinal_position;

-- CHECK TRIGGERS ON admin_messages
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'admin_messages';
