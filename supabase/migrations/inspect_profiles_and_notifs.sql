SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';

SELECT * FROM user_notifications ORDER BY created_at DESC LIMIT 10;
