-- CHECK 1: Avatar Column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'avatar_url';

-- CHECK 2: Storage Buckets
SELECT id, name, public 
FROM storage.buckets;
