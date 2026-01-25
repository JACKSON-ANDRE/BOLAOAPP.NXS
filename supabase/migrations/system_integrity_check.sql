-- 🏥 CHECK-UP GERAL DO SISTEMA (CORRIGIDO)

-- 1. Sincronia Auth vs Profiles (Usuários sem Perfil)
SELECT u.id, u.email, u.created_at 
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 2. Auditoria Financeira (Saldo Real vs Saldo em Cache)
-- O saldo na tabela 'profiles' deve bater com a soma das 'transactions'.
WITH CalculatedBalance AS (
    SELECT user_id, COALESCE(SUM(amount), 0) as real_balance
    FROM transactions 
    WHERE status IN ('completed', 'approved', 'won') -- Filtra apenas transações efetivadas
    GROUP BY user_id
)
SELECT 
    p.email, 
    p.balance as saldo_exibido, 
    cb.real_balance as saldo_calculado,
    (p.balance - cb.real_balance) as diferenca
FROM profiles p
JOIN CalculatedBalance cb ON p.id = cb.user_id
WHERE p.balance <> cb.real_balance;

-- 3. Detetive de Órfãos (Apostas sem dono ou sem bolão)
SELECT count(*) as apostas_orfas FROM bets 
WHERE user_id NOT IN (SELECT id FROM profiles) 
   OR pool_id NOT IN (SELECT id FROM pools);

-- 4. Status Geral (Contagem)
SELECT
    (SELECT count(*) FROM auth.users) as total_usuarios,
    (SELECT count(*) FROM pools) as total_boloes,
    (SELECT count(*) FROM bets) as total_apostas,
    (SELECT count(*) FROM transactions) as total_transacoes,
    (SELECT SUM(amount) FROM transactions WHERE type = 'deposit' AND status = 'approved') as total_depositado;

-- 5. Últimas 5 transações (para conferência)
SELECT created_at, type, amount, status, user_id FROM transactions
ORDER BY created_at DESC
LIMIT 5;
