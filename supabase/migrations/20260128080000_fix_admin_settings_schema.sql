-- 🛠️ FIX: Admin Dashboard Settings & Missing Columns
-- Description: Adds missing columns to app_settings table to support PIX, Push Notifications (VAPID/Secrets), and Fake User Count.

-- 1. Ensure columns exist in app_settings
DO $$ 
BEGIN
    -- PIX Columns
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'app_settings' AND COLUMN_NAME = 'pix_key') THEN
        ALTER TABLE public.app_settings ADD COLUMN pix_key text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'app_settings' AND COLUMN_NAME = 'pix_name') THEN
        ALTER TABLE public.app_settings ADD COLUMN pix_name text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'app_settings' AND COLUMN_NAME = 'pix_qrcode_url') THEN
        ALTER TABLE public.app_settings ADD COLUMN pix_qrcode_url text;
    END IF;

    -- Fake User Counting
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'app_settings' AND COLUMN_NAME = 'fake_user_count') THEN
        ALTER TABLE public.app_settings ADD COLUMN fake_user_count integer DEFAULT 0;
    END IF;

    -- Push Notification Credentials
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'app_settings' AND COLUMN_NAME = 'supabase_url') THEN
        ALTER TABLE public.app_settings ADD COLUMN supabase_url text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'app_settings' AND COLUMN_NAME = 'service_role_key') THEN
        ALTER TABLE public.app_settings ADD COLUMN service_role_key text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'app_settings' AND COLUMN_NAME = 'vapid_public_key') THEN
        ALTER TABLE public.app_settings ADD COLUMN vapid_public_key text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'app_settings' AND COLUMN_NAME = 'vapid_private_key') THEN
        ALTER TABLE public.app_settings ADD COLUMN vapid_private_key text;
    END IF;

    -- PWA Cache Management
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'app_settings' AND COLUMN_NAME = 'pwa_icon_updated_at') THEN
        ALTER TABLE public.app_settings ADD COLUMN pwa_icon_updated_at timestamp with time zone;
    END IF;

END $$;

-- 2. Ensure we have at least one settings row (ID=1 as expected by frontend)
-- Convert ID to integer if it was UUID by mistake in some environments, but here we keep UUID or match what frontend expects.
-- The frontend does .eq('id', 1), so id should be compatible with '1'.
-- Wait, the schema shows id as UUID. Let's fix the schema if needed or match the frontend.
-- In AdminDashboard.tsx line 294: .eq('id', 1). This usually implies id is an integer. 
-- Let's check the schema again. 20260124000000_release_1.0_schema.sql line 24 says id uuid.

-- FIX: Change id to bigint for app_settings to support .eq('id', 1) logic reliably
DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'id') = 'uuid' THEN
        ALTER TABLE public.app_settings DROP CONSTRAINT app_settings_pkey;
        ALTER TABLE public.app_settings ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE public.app_settings ALTER COLUMN id TYPE bigint USING 1;
        ALTER TABLE public.app_settings ADD PRIMARY KEY (id);
    END IF;
END $$;

INSERT INTO public.app_settings (id, maintenance_mode)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- 3. Ensure get_community_stats RPC exists
CREATE OR REPLACE FUNCTION public.get_community_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_pools int;
    v_total_paid numeric;
BEGIN
    SELECT COUNT(*) INTO v_total_pools FROM public.pools;
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM public.transactions WHERE type = 'winning' AND status = 'approved';
    
    RETURN json_build_object(
        'total_pools', v_total_pools,
        'total_paid', v_total_paid
    );
END;
$$;

-- 4. Ensure update_user_role RPC exists
CREATE OR REPLACE FUNCTION public.update_user_role(
    p_target_user_id uuid,
    p_new_role text,
    p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if sender is admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar cargos.';
    END IF;

    UPDATE public.profiles
    SET role = p_new_role, updated_at = now()
    WHERE id = p_target_user_id;
END;
$$;
