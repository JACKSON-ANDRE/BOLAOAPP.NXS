-- FIX Constraints on Transactions Table
-- The error "new row for relation transactions violates check constraint transactions_balance_type_check" happens because current constraints are too strict.

-- 1. Drop existing constraints
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_balance_type_check;

-- 2. Add Updated Constraints
-- Allow: deposit, bet, refund, withdrawal, withdraw, winning, bonus, bet_credit, bet_debit
ALTER TABLE transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('deposit', 'bet', 'refund', 'withdrawal', 'withdraw', 'winning', 'bonus', 'bet_credit', 'bet_debit'));

-- Allow: balance, withdrawable
ALTER TABLE transactions 
ADD CONSTRAINT transactions_balance_type_check 
CHECK (balance_type IN ('balance', 'withdrawable'));
