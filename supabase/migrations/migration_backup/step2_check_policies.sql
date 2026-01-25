-- PASSO 2: Ver as políticas RLS (permissões)

SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'withdraw_requests';
