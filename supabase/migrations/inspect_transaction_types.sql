
-- INSPECT TRANSACTION TYPES
-- We need to know what values are allowed for the 'type' column.
-- The error "violates check constraint transactions_type_check" blocked 'withdrawal'.

SELECT conname as constraint_name, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'transactions'::regclass
AND conname = 'transactions_type_check';
