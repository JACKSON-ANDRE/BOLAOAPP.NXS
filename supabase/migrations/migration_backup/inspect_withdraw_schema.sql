
-- INSPECT WITHDRAW SCHEMA
-- Check if withdraw_requests table exists and its columns
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'withdraw_requests';

-- Check if profiles has withdrawable_balance
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name LIKE '%balance%';
