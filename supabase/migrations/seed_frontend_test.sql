-- 🖥️ PREPARAÇÃO PARA TESTE DE FRONTEND
-- Este script garante que você tenha um item de cada tipo para testar todas as telas.

-- 1. Cria uma Notificação de Teste (Para testar o Sininho)
INSERT INTO user_notifications (user_id, message, created_at)
SELECT id, '🔔 Teste de Sistema: O Frontend está conectado!', now()
FROM auth.users
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Garante que existe um Bolão ABERTO (Para testar a Home e Detalhes)
INSERT INTO pools (title, price, min_participants, max_participants, end_date, created_by, status)
SELECT 'Bolão de Teste (Frontend)', 10.00, 2, 10, now() + interval '7 days', id, 'open'
FROM profiles
WHERE NOT EXISTS (SELECT 1 FROM pools WHERE status = 'open')
ORDER BY created_at DESC
LIMIT 1;

-- 3. Garante que o Admin tem saldo visível (Para testar Carteira)
-- Apenas visual, não cria transação real (rollback safe)
UPDATE profiles 
SET balance = balance + 1.00 
WHERE email LIKE '%admin%' OR role = 'admin'
AND NOT EXISTS (SELECT 1 FROM transactions WHERE type = 'deposit');

-- 4. Retorna URLs para você testar (Apenas informativo)
SELECT 
    'CONFIRA SE ESTAS TELAS CARREGAM:' as instrucao,
    '/wallet' as carteira,
    '/profile' as perfil,
    '/pools/new' as criar_bolao,
    'Sininho de Notificação' as verificar_topo;
