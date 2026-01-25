-- 📉 PERMITIR AJUSTES NEGATIVOS (SAQUE/CORREÇÃO) 📉
-- O banco de dados tinha uma regra "Proibido Valor Negativo".
-- Isso impedia você de diminuir o saldo de alguém (ajuste para baixo).
-- Vamos remover essa proibição.

BEGIN;

-- Remove a regra "transactions_amount_check" (que exigia amount > 0)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_amount_check;

-- Opcional: Adicionar uma regra mais flexível (apenas proíbe ZERO)
ALTER TABLE public.transactions ADD CONSTRAINT transactions_amount_check_nonzero 
CHECK (amount <> 0);

COMMIT;
