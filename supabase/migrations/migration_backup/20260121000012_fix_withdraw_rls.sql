-- FIX: Adicionar política RLS para ADMIN ver TODOS os saques

CREATE POLICY "Admins can view all withdraws" 
ON withdraw_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update withdraws" 
ON withdraw_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);
