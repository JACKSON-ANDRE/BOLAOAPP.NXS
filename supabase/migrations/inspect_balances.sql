-- Check if table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'user_balances' OR table_name = 'balances';

-- Check RLS policies for balances
SELECT * FROM pg_policies WHERE tablename = 'user_balances' OR tablename = 'balances';

-- Check data for the current user (blindly dumping all to see if *any* exist)
SELECT * FROM public.user_balances;
