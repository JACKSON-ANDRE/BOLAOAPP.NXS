-- 🔓 UNLOCK TRANSACTION TYPES (SOLUÇÃO IMEDIATA) 🔓
-- Este script REMOVE a validação de tipos da tabela transactions.
-- Isso vai permitir que o 'admin_adjustment' (e qualquer outro tipo) seja salvo sem erros.

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Pronto. Agora o banco aceita qualquer texto no campo 'type'.
