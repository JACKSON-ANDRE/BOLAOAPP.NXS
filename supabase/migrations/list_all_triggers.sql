
SELECT 
    event_object_table AS table_name, 
    trigger_name, 
    event_manipulation AS event,
    action_timing AS timing, 
    action_statement AS definition 
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
ORDER BY table_name, event;
