
-- DIAGNÓSTICO: Por que saques não aparecem no Admin?

-- 1. Verificar se existem registros na tabela
SELECT COUNT(*) as total_withdraw_requests FROM withdraw_requests;

-- 2. Listar TODOS os saques (ignorando RLS temporariamente se você for superuser)
SELECT * FROM withdraw_requests ORDER BY created_at DESC;

-- 3. Testar o JOIN exato que o frontend usa
SELECT 
  wr.*,
  p.full_name,
  p.withdrawable_balance
FROM withdraw_requests wr
LEFT JOIN profiles p ON wr.user_id = p.id
ORDER BY wr.created_at DESC;

-- 4. Verificar políticas RLS da tabela withdraw_requests
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'withdraw_requests';

-- 5. Verificar se RLS está ativo
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'withdraw_requests';
