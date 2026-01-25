-- 🕵️ DIAGNÓSTICO DE SALDO (USUÁRIO ESPECÍFICO)
-- Instrução: Mude o email abaixo (onde diz 'trocar@email.com') para o email do usuário que você quer investigar.
-- Depois clique em RUN.

WITH target_user AS (
    SELECT id, full_name, email, balance, withdrawable_balance 
    FROM public.profiles 
    WHERE email = 'trocar@email.com'  -- <--- COLOCAR EMAIL AQUI
    LIMIT 1
)
SELECT 
    '1. ESTADO ATUAL' as categoria,
    'Saldo de Jogo (Travado)' as detalhe,
    balance as valor,
    'Playable' as tipo_carteira
FROM target_user

UNION ALL

SELECT 
    '1. ESTADO ATUAL',
    'Saldo de Saque (Livre)',
    withdrawable_balance,
    'Withdrawable'
FROM target_user

UNION ALL

-- 2. CALCULAR HISTORICO
SELECT 
    '2. HISTÓRICO (O que soma?)',
    'Total: ' || type || ' (' || status || ')',
    SUM(amount),
    MAX(balance_type)
FROM public.transactions 
WHERE user_id = (SELECT id FROM target_user)
GROUP BY type, status

UNION ALL

-- 3. VERIFICAR INTEGRIDADE (Prova Real)
SELECT
    '3. PROVA REAL',
    'CALCULADO (Histórico) vs REAL (Perfil)',
    (
        -- Soma Depósitos - Apostas (Jogo)
        (SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id = (SELECT id FROM target_user) AND type='deposit' AND status='approved')
        -
        (SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id = (SELECT id FROM target_user) AND type='bet_debit' AND status='approved')
        -
        (SELECT balance FROM target_user)
    ),
    CASE 
        WHEN (
             (SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id = (SELECT id FROM target_user) AND type='deposit' AND status='approved')
             -
             (SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id = (SELECT id FROM target_user) AND type='bet_debit' AND status='approved')
             -
             (SELECT balance FROM target_user)
        ) = 0 THEN '✅ OK (Bateu)'
        ELSE '❌ ERRO (Diferença)'
    END

ORDER BY categoria, valor DESC;
