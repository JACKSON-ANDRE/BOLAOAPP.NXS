-- RPC: Get Full User Details for Admin Modal

CREATE OR REPLACE FUNCTION get_user_details_full(
  p_user_id uuid,
  p_admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_stats record;
  v_history json;
BEGIN
  -- 1. Check Admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- 2. Fetch Profile + Email (via Join)
  SELECT 
    p.*,
    u.email
  INTO v_profile
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- 3. Calculate Stats
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'deposit' AND status = 'approved' THEN amount ELSE 0 END), 0) as total_deposited,
    COUNT(CASE WHEN type = 'deposit' AND status = 'approved' THEN 1 END) as deposit_count,
    
    COALESCE(SUM(CASE WHEN (type = 'withdrawal' OR type = 'withdraw') AND status = 'approved' THEN amount ELSE 0 END), 0) as total_withdrawn,
    COUNT(CASE WHEN (type = 'withdrawal' OR type = 'withdraw') AND status = 'approved' THEN 1 END) as withdraw_count,

    COALESCE(SUM(CASE WHEN type = 'winning' AND status = 'approved' THEN amount ELSE 0 END), 0) as total_won,
    COUNT(CASE WHEN type = 'winning' AND status = 'approved' THEN 1 END) as win_count

  INTO v_stats
  FROM transactions
  WHERE user_id = p_user_id;

  -- 4. Fetch Recent History (Last 50)
  SELECT json_agg(t) INTO v_history
  FROM (
    SELECT * 
    FROM transactions 
    WHERE user_id = p_user_id 
    ORDER BY created_at DESC 
    LIMIT 50
  ) t;

  -- 5. Return JSON
  RETURN json_build_object(
    'profile', json_build_object(
      'id', v_profile.id,
      'full_name', v_profile.full_name,
      'email', v_profile.email,
      'role', v_profile.role,
      'balance', v_profile.balance,
      'withdrawable_balance', v_profile.withdrawable_balance,
      'created_at', v_profile.created_at,
      'pix_key', v_profile.pix_key
    ),
    'stats', json_build_object(
      'total_deposited', v_stats.total_deposited,
      'deposit_count', v_stats.deposit_count,
      'total_withdrawn', v_stats.total_withdrawn,
      'withdraw_count', v_stats.withdraw_count,
      'total_won', v_stats.total_won,
      'win_count', v_stats.win_count
    ),
    'history', COALESCE(v_history, '[]'::json)
  );

END;
$$;
