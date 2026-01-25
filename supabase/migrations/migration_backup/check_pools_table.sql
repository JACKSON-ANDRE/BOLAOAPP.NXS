-- Check if 'pools' table exists and its policies
SELECT 
    table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'pools';

-- Check policies for pools
SELECT * FROM pg_policies WHERE tablename = 'pools';
