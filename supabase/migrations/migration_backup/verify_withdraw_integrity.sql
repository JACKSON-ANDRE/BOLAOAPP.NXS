-- Verificar se há saques com user_id inválido

-- 1. Contar total de saques
SELECT COUNT(*) as total_withdraws FROM withdraw_requests;

-- 2. Verificar saques com user_id que NÃO existe em profiles
SELECT 
  wr.id,
  wr.user_id,
  wr.amount,
  wr.status,
  'INVALID - User does not exist' as problema
FROM withdraw_requests wr
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = wr.user_id
);

-- 3. Listar APENAS saques válidos (com user_id existente)
SELECT 
  wr.*,
  p.full_name,
  p.role
FROM withdraw_requests wr
INNER JOIN profiles p ON wr.user_id = p.id;
