-- BANK GRADE CONSTRAINTS
-- Purpose: Ensure balances never go below zero at the database level.

ALTER TABLE public.profiles 
ADD CONSTRAINT check_balance_non_negative CHECK (balance >= 0);

ALTER TABLE public.profiles 
ADD CONSTRAINT check_withdrawable_non_negative CHECK (withdrawable_balance >= 0);
