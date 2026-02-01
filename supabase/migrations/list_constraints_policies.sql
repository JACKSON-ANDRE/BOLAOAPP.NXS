
-- 1. List Check Constraints
SELECT conname as constraint_name, conrelid::regclass as table_name, pg_get_constraintdef(c.oid) as definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public' AND contype = 'c';

-- 2. List RLS Policies
SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public';
