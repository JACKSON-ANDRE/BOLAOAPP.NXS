-- Inspect transactions table schema and constraints
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions';

-- List constraints on transactions table
SELECT 
    conname as constraint_name, 
    pg_get_constraintdef(c.oid) as definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE conrelid = 'public.transactions'::regclass;
