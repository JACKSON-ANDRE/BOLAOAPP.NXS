-- SUPER FIX: PERMISSÕES DE PRODUÇÃO
-- Este script corrige TODOS os problemas de permissão (Sininho sumido e Troca de Palpite)
-- Rode ele inteiro no Supabase SQL Editor

-- 1. CORREÇÃO: TROCA DE PALPITE (Permitir UPDATE na tabela bets)
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can update their own bets" ON bets;
CREATE POLICY "Users can update their own bets"
ON bets FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. CORREÇÃO: VISUALIZAR NOTIFICAÇÕES (Permitir SELECT na user_notifications)
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own notifications" ON user_notifications;
CREATE POLICY "Users can view their own notifications"
ON user_notifications FOR SELECT
USING (auth.uid() = user_id);

-- 3. CORREÇÃO: SISTEMA CRIAR NOTIFICAÇÃO (Permitir INSERT pelo Admin/RPC)
DROP POLICY IF EXISTS "System can insert notifications" ON user_notifications;
CREATE POLICY "System can insert notifications"
ON user_notifications FOR INSERT
WITH CHECK (true);

-- 4. Confirmação (mostra se funcionou)
SELECT 'SUCCESS' as status, 'Permissões Aplicadas com Sucesso' as message;
