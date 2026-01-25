-- VERIFICAR SE O CÓDIGO BLINDADO ESTÁ ATIVO
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'place_bet';
