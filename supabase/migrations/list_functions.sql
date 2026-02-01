
SELECT routine_name, data_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;
