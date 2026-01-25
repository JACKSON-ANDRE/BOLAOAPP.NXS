-- 🚨 FORCE FIX: TRANSACTIONS TYPE CONSTRAINT 🚨
-- Este script remove a regra antiga e cria uma nova permitindo 'admin_adjustment'.

BEGIN;

-- 1. Remove a restrição antiga (Se existir)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- 2. Adiciona a nova restrição com TODOS os tipos permitidos
-- Incluindo o novo 'admin_adjustment'
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN (
    'deposit', 
    'withdrawal', 
    'bet_debit', 
    'bet_credit', 
    'winning', 
    'refund', 
    'admin_adjustment'
));

COMMIT;
