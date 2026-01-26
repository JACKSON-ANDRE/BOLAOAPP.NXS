CREATE OR REPLACE FUNCTION get_admin_users_list()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  role text,
  balance numeric,
  withdrawable_balance numeric,
  avatar_url text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Strict Admin Check
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
    p.role::text,
    p.balance,
    p.withdrawable_balance,
    p.avatar_url,
    p.created_at
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  ORDER BY p.created_at DESC;
END;
$$;
