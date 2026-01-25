-- Verificar se as políticas de ADMIN foram criadas

SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'withdraw_requests'
ORDER BY policyname;
