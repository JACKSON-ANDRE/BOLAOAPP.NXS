-- 🚨 FIX: LIBERAR TIPO DE TRANSAÇÃO 'admin_adjustment' 🚨
-- O erro aconteceu porque o Banco de Dados tem uma "lista VIP" de tipos permitidos, e o novo tipo não estava nela.
-- Este script atualiza a lista.

DO $$
BEGIN
    -- 1. Remover a regra antiga
    ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

    -- 2. Criar a regra nova (Incluindo 'admin_adjustment')
    ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
    CHECK (type IN (
        'deposit', 
        'withdrawal', 
        'bet_debit', 
        'bet_credit', 
        'winning', 
        'refund', 
        'admin_adjustment' -- <--- NOVO TIPO ADICIONADO
    ));

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao aplicar constraint: %', SQLERRM;
        -- Fallback: Se der erro (ex: tem algum tipo estranho no banco), removemos a checagem temporariamente para não travar
        -- ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
END $$;
