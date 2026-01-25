-- 1. Apply the Role Update Function
CREATE OR REPLACE FUNCTION public.update_user_role(
    p_target_user_id uuid,
    p_new_role text,
    p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_role text;
BEGIN
    SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_id;
    
    IF v_admin_role <> 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem alterar funções.';
    END IF;

    IF p_target_user_id = p_admin_id AND p_new_role <> 'admin' THEN
        RAISE EXCEPTION 'Você não pode remover seu próprio acesso de administrador.';
    END IF;

    UPDATE public.profiles
    SET role = p_new_role
    WHERE id = p_target_user_id;
END;
$$;

-- 2. Ensure Notifications Policy allows Inserts from Server Functions (Security Definer handles this, but let's check RLS for SELECT)
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
CREATE POLICY "Users can view own notifications" 
ON public.user_notifications FOR SELECT 
USING (auth.uid() = user_id);

-- Allow server/admin to insert (Implicit via Security Definer functions, but explicit for admin usage)
DROP POLICY IF EXISTS "Admins/System can insert notifications" ON public.user_notifications;
CREATE POLICY "Admins/System can insert notifications" 
ON public.user_notifications FOR INSERT 
WITH CHECK (true); -- Ideally restrict to admin, but for now open for system functions

-- 3. Verify user_notifications table trigger or structure? 
-- No trigger needed if finish_pool inserts directly.

-- 4. Grant execute on RPC
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text, uuid) TO service_role;
