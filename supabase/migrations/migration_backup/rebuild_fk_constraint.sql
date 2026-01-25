-- Recriar a Foreign Key constraint corretamente

-- 1. Dropar a constraint existente
ALTER TABLE withdraw_requests 
DROP CONSTRAINT IF EXISTS withdraw_requests_user_id_fkey;

-- 2. Recriar a constraint com validação correta
ALTER TABLE withdraw_requests
ADD CONSTRAINT withdraw_requests_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- 3. Testar a query EXATA que o frontend usa
SELECT 
  wr.*,
  json_build_object(
    'full_name', p.full_name,
    'withdrawable_balance', p.withdrawable_balance
  ) as profiles
FROM withdraw_requests wr
LEFT JOIN profiles p ON wr.user_id = p.id
ORDER BY wr.created_at DESC;
