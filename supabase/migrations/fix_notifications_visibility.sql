-- FIX NOTIFICATIONS VISIBILITY
-- Habilita o usuário a VER suas próprias notificações

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- 1. Remove políticas antigas (para limpar a casa)
DROP POLICY IF EXISTS "Users can view their own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON user_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON user_notifications;

-- 2. Cria política de LEITURA (Crucial para o sininho funcionar)
CREATE POLICY "Users can view their own notifications"
ON user_notifications FOR SELECT
USING (auth.uid() = user_id);

-- 3. Cria política de INSERÇÃO (Para o sistema criar o aviso)
CREATE POLICY "System can insert notifications"
ON user_notifications FOR INSERT
WITH CHECK (true);

-- 4. Cria política de ATUALIZAÇÃO (Para marcar como lida/deletar)
CREATE POLICY "Users can update their own notifications"
ON user_notifications FOR UPDATE
USING (auth.uid() = user_id);
