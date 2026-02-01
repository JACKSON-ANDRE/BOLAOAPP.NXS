
-- INSPECT CONSTRAINTS
-- We need to see what values are allowed for 'balance_type'.
-- This query shows the definition of the check constraint.

SELECT conname as constraint_name, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'transactions'::regclass
AND conname = 'transactions_balance_type_check';
