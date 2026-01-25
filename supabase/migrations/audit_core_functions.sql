-- AUDITORIA DE FUNÇÕES CORE
-- Recupera o código fonte das funções críticas para validação dos fluxos.

SELECT 'process_deposit_request'::text as func_name, pg_get_functiondef(oid) as code FROM pg_proc WHERE proname = 'process_deposit_request'
UNION ALL
SELECT 'process_withdrawal_request'::text, pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'process_withdrawal_request'
UNION ALL
SELECT 'finish_pool'::text, pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'finish_pool'
UNION ALL
SELECT 'place_bet'::text, pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'place_bet';
