-- LIMPAR saques inválidos e criar um novo válido

-- 1. Deletar TODOS os saques antigos (dados de teste inválidos)
DELETE FROM withdraw_requests;

-- 2. Criar um novo saque válido usando o ID do primeiro admin encontrado
INSERT INTO withdraw_requests (user_id, amount, pix_key, status)
SELECT 
  id,
  50.00,
  'teste@pix.com',
  'pending'
FROM profiles
WHERE role = 'admin'
LIMIT 1;

-- 3. Verificar se foi criado corretamente
SELECT 
  wr.*,
  p.full_name,
  p.role,
  p.withdrawable_balance
FROM withdraw_requests wr
LEFT JOIN profiles p ON wr.user_id = p.id;
