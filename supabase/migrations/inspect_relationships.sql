-- INSPECT ADMIN MESSAGES
select min(tablename) as table_name, indexname, indexdef from pg_indexes where tablename in ('user_notifications', 'admin_messages') group by tablename, indexname, indexdef;

select * from pg_policies where tablename = 'admin_messages';

-- Check foreign keys on user_notifications
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'user_notifications';
