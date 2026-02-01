-- LIMPAR saques com user_id inválido e criar um novo válido

-- 1. Deletar TODOS os saques antigos (dados de teste inválidos)
DELETE FROM withdraw_requests;

-- 2. Criar um novo saque válido para o usuário logado (você, admin)
INSERT INTO withdraw_requests (user_id, amount, pix_key, status)
VALUES (
  auth.uid(),  -- Seu ID de usuário logado
  50.00,
  'teste@pix.com',
  'pending'
);

-- 3. Verificar se foi criado corretamente
SELECT 
  wr.*,
  p.full_name,
  p.role
FROM withdraw_requests wr
LEFT JOIN profiles p ON wr.user_id = p.id;
