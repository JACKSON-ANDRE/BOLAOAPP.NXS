-- DIAGNÓSTICO: POR QUE 1356?
-- Vamos somar todas as transações "approved" para mostrar de onde vem esse valor.

SELECT 
    t.type,
    COUNT(*) as qtd,
    SUM(t.amount) as total_por_tipo
FROM transactions t
JOIN profiles p ON p.id = t.user_id
WHERE p.email LIKE 'jackson%' -- Filtra pelo seu usuário (ou o mais recente)
AND t.status = 'approved'
AND t.balance_type = 'balance' -- Apenas Saldo de Jogo
GROUP BY t.type;

-- Soma Total
SELECT 
    SUM(t.amount) as SALDO_REAL_CALCULADO
FROM transactions t
JOIN profiles p ON p.id = t.user_id
WHERE p.email LIKE 'jackson%'
AND t.status = 'approved'
AND t.balance_type = 'balance';
