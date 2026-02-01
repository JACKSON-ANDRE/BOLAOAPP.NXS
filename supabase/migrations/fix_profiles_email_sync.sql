-- FIX PROFILES EMAIL AND NAME SYNC
-- 1. Create a function to backfill emails from auth.users to profiles
-- 2. Update the handle_new_user trigger to ensure email and name are saved on registration.

-- PART 1: Backfill Function (Security Definer allows accessing auth.users)
CREATE OR REPLACE FUNCTION backfill_profiles_email()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record record;
BEGIN
  -- Iterator over auth.users
  FOR user_record IN 
    SELECT id, email, raw_user_meta_data
    FROM auth.users
  LOOP
    -- Update profile with email if missing
    UPDATE public.profiles
    SET 
      email = user_record.email,
      -- Try to fix name if missing
      full_name = COALESCE(full_name, (user_record.raw_user_meta_data->>'full_name')::text, (user_record.raw_user_meta_data->>'name')::text, 'Usuário sem nome')
    WHERE id = user_record.id;
  END LOOP;
END;
$$;

-- Run the backfill immediately
SELECT backfill_profiles_email();

-- PART 2: Robust New User Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'full_name')::text,
      (NEW.raw_user_meta_data->>'name')::text,
      'Novo Usuário'
    ),
    'user',
    NEW.email -- Ensure Email is saved
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name);
    
  RETURN NEW;
END;
$$;

-- Ensure the trigger is bound (Re-create to be safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
