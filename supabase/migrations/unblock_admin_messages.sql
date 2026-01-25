-- DESTRANCAR APARELHO DE NOTIFICAÇÕES
-- Habilita leitura da tabela auxiliar 'admin_messages'
-- Isso DEVE resolver o problema de "Failed to fetch" ou lista vazia

ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- Remove política antiga se houver
DROP POLICY IF EXISTS "Users can read admin messages" ON admin_messages;

-- Cria política permissiva (Todo mundo pode ler)
CREATE POLICY "Users can read admin messages"
ON admin_messages FOR SELECT
USING (true);

-- Confirmação
SELECT 'SUCCESS' as status, 'Leitura de admin_messages liberada' as message;
