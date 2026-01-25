-- DIAGNOSE ADMIN BALANCE (TABLE VISUALIZATION)
-- Runs a query that forces the Supabase UI to show results in a table.

WITH admin_user AS (
    SELECT id, full_name, email, balance, withdrawable_balance 
    FROM public.profiles 
    WHERE role = 'admin' 
    LIMIT 1
)
SELECT 
    '1. ESTADO ATUAL' as categoria,
    'Saldo de Jogo (Travado)' as detalhe,
    balance as valor,
    'Playable' as tipo_carteira
FROM admin_user

UNION ALL

SELECT 
    '1. ESTADO ATUAL',
    'Saldo de Saque (Livre)',
    withdrawable_balance,
    'Withdrawable'
FROM admin_user

UNION ALL

SELECT 
    '2. HISTÓRICO (O que soma?)',
    'Total: ' || type || ' (' || status || ')',
    SUM(amount),
    MAX(balance_type)
FROM public.transactions 
WHERE user_id = (SELECT id FROM admin_user)
GROUP BY type, status
ORDER BY categoria, valor DESC;
