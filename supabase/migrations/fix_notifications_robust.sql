-- FIX NOTIFICATIONS VISIBILITY (ROBUST)
-- Remove políticas se existirem para evitar erro de "already exists"

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- 1. Remove políticas antigas (GARANTE QUE NÃO DÁ ERRO)
DROP POLICY IF EXISTS "Users can view their own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON user_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON user_notifications;

-- 2. Recria as políticas corretamente
CREATE POLICY "Users can view their own notifications"
ON user_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON user_notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON user_notifications FOR UPDATE
USING (auth.uid() = user_id);
