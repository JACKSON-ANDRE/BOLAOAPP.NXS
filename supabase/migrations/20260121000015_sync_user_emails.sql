-- SYNC EMAILS TO PROFILES
-- We need emails in the public profiles table for Admin listing (and search).

-- 1. Add email column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email text;

-- 2. Create Trigger Function to Sync Email on Insert/Update
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET 
    email = NEW.email,
    updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger on AUTH.USERS (Requires supabase admin privileges usually, but migrations run as admin)
-- Note: In standard Supabase, we can't always create triggers on auth.users easily via SQL Editor if we aren't superuser.
-- However, the "handle_new_user" trigger usually already exists. Let's modify/check it.

-- Workaround: We will use a SECURITY DEFINER function to backfill existing emails.
-- We cannot easily SELECT from auth.users in user-land SQL unless we are postgres role.

-- Let's try to update the existing 'handle_new_user' if it exists in your snippets, 
-- or create a new one for updates.

-- For now, let's just make sure the column exists. 
-- The "Sync" will happen via a special RPC that the Admin runs once, 
-- OR we rely on the client to send it (less secure).

-- BETTER APPROACH: 
-- We create a View that Joins profiles and auth.users ?
-- No, RLS on auth.users is strict.

-- BEST APPROACH for Admin Dashboard:
-- Create a SECURITY DEFINER RPC that returns the joined data.

CREATE OR REPLACE FUNCTION get_admin_users_list()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  role text, -- Changed from user_role to text
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
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    u.email::text, -- Cast to text
    p.role,
    p.balance,
    p.withdrawable_balance,
    p.created_at
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  ORDER BY p.created_at DESC;
END;
$$;
