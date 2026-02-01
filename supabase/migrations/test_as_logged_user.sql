-- Testar se o usuário logado consegue ver os saques

-- Primeiro, verificar quem você é
SELECT auth.uid() as meu_id;

-- Verificar se você é admin
SELECT id, full_name, role FROM profiles WHERE id = auth.uid();

-- Tentar buscar saques (igual o frontend faz)
SELECT 
  wr.*,
  p.full_name,
  p.withdrawable_balance
FROM withdraw_requests wr
LEFT JOIN profiles p ON wr.user_id = p.id
ORDER BY wr.created_at DESC;
