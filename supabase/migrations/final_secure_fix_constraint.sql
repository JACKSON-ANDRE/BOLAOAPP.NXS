-- 🔒 FINAL SECURE FIX: LISTA COMPLETA DE TIPOS 🔒
-- Encontramos o culpado: Existem transações do tipo 'withdraw' (sem o 'al' no final) no banco.
-- Esta regra blinda o banco permitindo APENAS os tipos que existem + o novo ajuste.

BEGIN;

-- 1. Remove qualquer regra antiga
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- 2. Cria a regra final com TODOS os tipos encontrados na auditoria
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN (
    'deposit',           -- Depósitos
    'withdrawal',        -- Saque (Padrão Novo)
    'withdraw',          -- Saque (Legado/Encontrado na Auditoria)
    'bet_debit',         -- Aposta
    'bet_credit',        -- Crédito de Aposta
    'winning',           -- Prêmio
    'refund',            -- Reembolso
    'admin_adjustment'   -- <--- NOSSO OBJETIVO
));

COMMIT;
