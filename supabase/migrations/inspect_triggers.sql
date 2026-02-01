SELECT 
    event_object_table AS table_name, 
    trigger_name, 
    event_manipulation, 
    action_statement 
FROM 
    information_schema.triggers 
WHERE 
    event_object_table IN ('bets', 'transactions');
