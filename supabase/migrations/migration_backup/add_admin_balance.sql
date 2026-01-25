
-- ADD ADMIN BALANCE
-- Adds 200.00 to the withdrawable balance of ALL admins so you can test.

UPDATE profiles
SET 
  withdrawable_balance = COALESCE(withdrawable_balance, 0) + 200,
  balance = COALESCE(balance, 0) + 200 -- Updating main balance too for consistency
WHERE role = 'admin';

-- Verify the result
SELECT full_name, role, balance, withdrawable_balance 
FROM profiles 
WHERE role = 'admin';
