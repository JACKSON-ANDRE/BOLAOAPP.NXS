-- Security Audit Fixes - 2026-01-30
-- Fixing vulnerabilities reported by Supabase Security Advisor

-- ==============================================================================
-- 1. DEPOSITS: Fix accidental public write access
-- The previous policy lacked "TO service_role", effectively making it public.
-- ==============================================================================
DROP POLICY IF EXISTS "Service role can manage deposits" ON public.deposits;

CREATE POLICY "Service role can manage deposits"
ON public.deposits
TO service_role
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 2. WEBHOOK_LOGS: Remove explicit public access
-- ==============================================================================
DROP POLICY IF EXISTS "Enable all for everyone" ON public.webhook_logs;

CREATE POLICY "Service role can manage webhook logs"
ON public.webhook_logs
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view webhook logs"
ON public.webhook_logs
FOR SELECT
TO authenticated
USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- ==============================================================================
-- 3. USER_PUSH_SUBSCRIPTIONS: Add missing SELECT capability
-- ==============================================================================
-- Users often check if they are subscribed (NotificationGuard).
-- Dropping duplicate if exists to be safe, though unlikely collision.
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_push_subscriptions;

CREATE POLICY "Users can view their own subscriptions"
ON public.user_push_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ==============================================================================
-- 4. APP_SETTINGS: Lock down sensitive configuration
-- Contains 'service_role_key'. Must be strictly private.
-- ==============================================================================
ALTER TABLE IF EXISTS public.app_settings ENABLE ROW LEVEL SECURITY;

-- Remove any potential public access policies (checking safe names)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_settings;
DROP POLICY IF EXISTS "Public read access" ON public.app_settings;

-- Ensure Service Role has full access
DROP POLICY IF EXISTS "Service role manages app settings" ON public.app_settings;

CREATE POLICY "Service role manages app settings"
ON public.app_settings
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure Admins can READ settings (for dashboard, if needed directly, 
-- though usually they go through functions)
-- SAFEGUARD: Only allow reading non-secret columns? 
-- RLS doesn't support column-level filtering easily without views.
-- For now, we assume admin is trusted or uses SECURITY DEFINER functions.
-- We will implicit deny mostly.
