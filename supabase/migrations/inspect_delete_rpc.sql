SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'delete_pool_with_refund';
