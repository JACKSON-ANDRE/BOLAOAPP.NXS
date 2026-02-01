-- Inspect Profiles Data
SELECT id, email, full_name, role, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;
