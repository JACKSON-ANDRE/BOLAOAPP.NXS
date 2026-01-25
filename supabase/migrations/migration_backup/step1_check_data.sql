-- PASSO 1: Verificar se existem saques no banco

SELECT * FROM withdraw_requests ORDER BY created_at DESC;
