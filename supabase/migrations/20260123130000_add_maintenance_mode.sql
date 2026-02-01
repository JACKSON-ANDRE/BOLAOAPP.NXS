-- 1. Add maintenance_mode column to app_settings
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT FALSE;

-- 2. Function to check maintenance mode
CREATE OR REPLACE FUNCTION is_maintenance_active()
RETURNS BOOLEAN AS $$
DECLARE
    is_active BOOLEAN;
BEGIN
    SELECT maintenance_mode INTO is_active FROM public.app_settings WHERE id = 1;
    RETURN COALESCE(is_active, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to check if user is exempt (Admin)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Policies to BLOCK WRITES during maintenance
-- logic: IF maintenance is active AND user is NOT admin -> DENY
-- Since Supabase Policies are permissive (OR), we need to ensure existing policies don't override this.
-- However, standard Policies are "WITH CHECK" for inserts/updates.
-- A cleaner way is to add a constraint or trigger, OR update existing policies.
-- Let's use a TRIGGER to fallback-block everything, as it's safer than auditing 50 policies.

CREATE OR REPLACE FUNCTION enforce_maintenance_mode()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow Admins to bypass
    IF is_admin() THEN
        RETURN NEW;
    END IF;

    -- If Maintenance is ON, block writes
    IF is_maintenance_active() THEN
        RAISE EXCEPTION 'O sistema está em manutenção. Tente novamente em instantes.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply Trigger to Critical Tables
-- BETS
DROP TRIGGER IF EXISTS check_maintenance_bets ON public.bets;
CREATE TRIGGER check_maintenance_bets
BEFORE INSERT OR UPDATE ON public.bets
FOR EACH ROW EXECUTE FUNCTION enforce_maintenance_mode();

-- MOVES (Transactions block - actually better to block requests)
DROP TRIGGER IF EXISTS check_maintenance_deposit_req ON public.deposit_requests;
CREATE TRIGGER check_maintenance_deposit_req
BEFORE INSERT OR UPDATE ON public.deposit_requests
FOR EACH ROW EXECUTE FUNCTION enforce_maintenance_mode();

DROP TRIGGER IF EXISTS check_maintenance_withdraw_req ON public.withdraw_requests;
CREATE TRIGGER check_maintenance_withdraw_req
BEFORE INSERT OR UPDATE ON public.withdraw_requests
FOR EACH ROW EXECUTE FUNCTION enforce_maintenance_mode();

DROP TRIGGER IF EXISTS check_maintenance_pools ON public.pools;
CREATE TRIGGER check_maintenance_pools
BEFORE INSERT OR UPDATE ON public.pools
FOR EACH ROW EXECUTE FUNCTION enforce_maintenance_mode();
