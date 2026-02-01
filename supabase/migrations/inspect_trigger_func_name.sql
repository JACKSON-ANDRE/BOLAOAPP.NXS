SELECT 
    tgname, 
    proname as function_name
FROM 
    pg_trigger t
JOIN 
    pg_proc p ON t.tgfoid = p.oid
WHERE 
    tgname = 'on_transaction_created';
