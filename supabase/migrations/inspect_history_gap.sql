-- INVESTIGAÇÃO: HISTÓRICO X MANUAL
-- Vamos ver a diferença entre o que o "Extrato" diz e o que estava na "Carteira".

SELECT 
    p.email,
    p.balance as "Saldo na Carteira (Agora)",
    (
        SELECT COALESCE(SUM(amount), 0) 
        FROM transactions 
        WHERE user_id = p.id AND status = 'approved' AND balance_type = 'balance'
    ) as "Soma do Extrato (Sistema)",
    p.balance - (
        SELECT COALESCE(SUM(amount), 0) 
        FROM transactions 
        WHERE user_id = p.id AND status = 'approved' AND balance_type = 'balance'
    ) as "Diferença (Manual vs Sistema)"
FROM profiles p
WHERE p.email LIKE 'jackson%'
ORDER BY p.updated_at DESC
LIMIT 1;

-- Ver se existem transações antigas que podem estar atrapalhando
SELECT created_at, type, amount, description
FROM transactions 
WHERE user_id = (SELECT id FROM profiles WHERE email LIKE 'jackson%' LIMIT 1)
ORDER BY created_at ASC;
