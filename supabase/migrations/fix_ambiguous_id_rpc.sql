-- FIX AMBIGUOUS ID IN RPC
-- The variable 'id' (output parameter) conflicts with 'id' column in the WHERE clause.

CREATE OR REPLACE FUNCTION get_admin_users_list()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  role text,
  balance numeric,
  withdrawable_balance numeric,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Strict Admin Check
  -- Qualify 'profiles.id' to avoid conflict with output parameter 'id'
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    u.email::text,
    p.role::text, -- Ensure casting just in case
    p.balance,
    p.withdrawable_balance,
    p.created_at
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  ORDER BY p.created_at DESC;
END;
$$;
