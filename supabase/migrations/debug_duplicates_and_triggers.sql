-- CHECK FOR DOUBLE TRANSACTIONS AND TRIGGERS
-- 1. Check recent transactions for Admin (to see if doubled)
SELECT * FROM transactions 
WHERE created_at > now() - interval '10 minutes'
ORDER BY created_at DESC;

-- 2. Check Triggers on Transactions table
SELECT event_object_table as table_name, trigger_name, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'transactions';
