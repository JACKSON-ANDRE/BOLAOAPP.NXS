SELECT
    con.conname, 
    con.contype, 
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM 
    pg_constraint con 
    JOIN pg_class rel ON rel.oid = con.conrelid 
    JOIN pg_namespace nsp ON nsp.oid = connamespace 
WHERE 
    nsp.nspname = 'public' 
    AND rel.relname = 'transactions';
