-- CHECK USER STATE (BETS & BALANCE)
-- Vamos ver se o banco descontou e a tela que não atualizou, ou se o banco não descontou mesmo.

SELECT 
    p.email, 
    p.balance as "Saldo Atual (Banco)", 
    p.withdrawable_balance as "Saldo Saque",
    (SELECT COUNT(*) FROM bets WHERE user_id = p.id) as "Total Apostas",
    (SELECT created_at FROM bets WHERE user_id = p.id ORDER BY created_at DESC LIMIT 1) as "Última Aposta",
    (SELECT amount FROM bets WHERE user_id = p.id ORDER BY created_at DESC LIMIT 1) as "Valor Última Aposta"
FROM profiles p
ORDER BY p.updated_at DESC
LIMIT 1;

-- Ver últimas transações também
SELECT * FROM transactions 
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC;
