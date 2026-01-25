-- INSPECT TRIGGERS ON TRANSACTIONS
SELECT 
    tgname as trigger_name,
    pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'transactions'::regclass;
