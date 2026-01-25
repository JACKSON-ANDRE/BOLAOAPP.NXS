-- CHECK RLS POLICIES
SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('profiles', 'transactions', 'deposit_requests', 'withdraw_requests');
