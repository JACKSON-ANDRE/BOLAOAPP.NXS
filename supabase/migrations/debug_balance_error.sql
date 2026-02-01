
-- DEBUG BALANCE ERROR
-- This script gathers info to understand why "column balance does not exist".

-- 1. List Columns in 'transactions'
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions';

-- 2. List Columns in 'profiles'
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- 3. List ALL Triggers on 'transactions' and 'profiles'
SELECT 
    event_object_table as table,
    trigger_name
FROM information_schema.triggers 
WHERE event_object_table IN ('transactions', 'profiles');

-- 4. Show definition of our trigger function
SELECT pg_get_functiondef('public.handle_new_transaction'::regproc);
