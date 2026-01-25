-- INSPECT PLACE_BET FUNCTION
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'place_bet';
