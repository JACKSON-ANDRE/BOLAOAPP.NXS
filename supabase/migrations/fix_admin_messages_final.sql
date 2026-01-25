-- FIX TOTAL: MENSAGENS E PERMISSÕES
-- 1. Permite que Admins recebam mensagens globais
-- 2. Resolve o Erro 403 (Permissão negada)

-- PARTE A: Corrigir o "Carteiro" (Gatilho)
CREATE OR REPLACE FUNCTION handle_new_admin_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.target_user_id IS NOT NULL THEN
        -- Mensagem Direta: Manda só pro alvo
        INSERT INTO public.user_notifications (user_id, message, type)
        VALUES (NEW.target_user_id, NEW.message, 'info');
    ELSE
        -- Mensagem Global: Manda pra TODO MUNDO (inclusive Admin)
        -- Removemos o filtro "WHERE role != admin"
        INSERT INTO public.user_notifications (user_id, message, type)
        SELECT id, NEW.message, 'info'
        FROM public.profiles; 
    END IF;
    
    RETURN NEW;
END;
$$;

-- PARTE B: Corrigir as Permissões (Erro 403)
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- Limpar regras antigas
DROP POLICY IF EXISTS "Admins can do everything on admin_messages" ON admin_messages;
DROP POLICY IF EXISTS "Users can read own messages" ON admin_messages;

-- Regra Supina: Admin faz tudo (Ler, Escrever, Apagar)
CREATE POLICY "Admins can do everything on admin_messages"
ON admin_messages
FOR ALL
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Regra de Usuário: Só lê o que é dele (ou global)
CREATE POLICY "Users can read own messages"
ON admin_messages
FOR SELECT
USING (
  target_user_id IS NULL OR target_user_id = auth.uid()
);
