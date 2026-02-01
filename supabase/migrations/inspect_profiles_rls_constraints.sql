-- Inspect RLS Policies on profiles
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    tablename = 'profiles';

-- Inspect Constraints on profiles (checking for Unique on full_name)
SELECT
    conname,
    contype,
    pg_get_constraintdef(oid)
FROM
    pg_constraint
WHERE
    conrelid = 'profiles'::regclass;
