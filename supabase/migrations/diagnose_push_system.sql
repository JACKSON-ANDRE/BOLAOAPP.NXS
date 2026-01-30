-- 🕵️‍♂️ DIAGNÓSTICO DE SISTEMA DE NOTIFICAÇÕES (V2 - ROBUSTA)

-- 1. Verificar Configurações Base e PWA
SELECT 'CONFIGURAÇÕES' as status;
SELECT 
    id, 
    supabase_url,
    LENGTH(service_role_key) as len_key,
    LENGTH(vapid_public_key) as len_vapid_pub,
    LENGTH(vapid_private_key) as len_vapid_priv,
    maintenance_mode
FROM public.app_settings;

-- 2. Verificar Assinaturas do Navegador
SELECT 'ASSINANTES' as status;
SELECT count(*) as total_dispositivos_registrados 
FROM public.user_push_subscriptions;

-- 3. Verificar se as extensões necessárias estão ativas (pg_net)
SELECT 'EXTENSÕES' as status;
SELECT name, default_version, installed_version 
FROM pg_available_extensions 
WHERE name = 'pg_net';

-- 4. Verificar Fila de Envio (pg_net)
-- Isso mostra se o banco tentou chamar a Edge Function e o que aconteceu.
SELECT 'FILA DE ENVIO (NET)' as status;
SELECT id, status, message, created_at 
FROM net.http_requests 
ORDER BY id DESC LIMIT 10;

-- 5. Verificar existência de tabelas de log (Evitando Erro 42P01)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'webhook_logs') THEN
        EXECUTE 'SELECT ''LOGS DE WEBHOOK'' as status;';
        -- O usuário pode rodar isso separado se a tabela aparecer:
        -- SELECT * FROM public.webhook_logs ORDER BY created_at DESC LIMIT 5;
    ELSE
        RAISE NOTICE 'Atenção: Tabela webhook_logs não existe. Sugerido rodar a migration de criação de logs.';
    END IF;
END $$;

-- 6. TESTE DE DISPARO MANUAL (Somente SQL)
-- Pegue um ID de usuário da tabela profiles e substitua abaixo para testar.
/*
SELECT public.trigger_pwa_push(
    p_user_id := 'ID-DO-USUARIO-AQUI',
    p_title := 'Teste SQL',
    p_body := 'Verificando motor de envio'
);
*/
