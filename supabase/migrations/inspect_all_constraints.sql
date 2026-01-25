-- INSPECT ALL CONSTRAINTS ON TRANSACTIONS
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'transactions'::regclass;
