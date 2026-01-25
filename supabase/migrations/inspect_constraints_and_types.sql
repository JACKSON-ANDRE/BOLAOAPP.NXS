-- INSPECT CONSTRAINTS AND TYPES
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'transactions'::regclass AND conname = 'transactions_type_check';

SELECT DISTINCT type FROM transactions;
