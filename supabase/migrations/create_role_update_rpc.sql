-- FUNCTION: update_user_role
-- Allows an Admin to change another user's role (admin/user)

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
    -- 1. Verify caller is an Admin
    SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_id;
    
    IF v_admin_role <> 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem alterar funções.';
    END IF;

    -- 2. Prevent self-demotion (Safety Lock)
    IF p_target_user_id = p_admin_id AND p_new_role <> 'admin' THEN
        RAISE EXCEPTION 'Você não pode remover seu próprio acesso de administrador.';
    END IF;

    -- 3. Update the role
    UPDATE public.profiles
    SET role = p_new_role
    WHERE id = p_target_user_id;

    -- 4. Log the action (Optional but recommended)
    INSERT INTO public.admin_messages (message, created_at)
    VALUES ('O usuário ' || p_target_user_id || ' teve seu cargo alterado para ' || p_new_role || ' pelo admin ' || p_admin_id, now());

END;
$$;
