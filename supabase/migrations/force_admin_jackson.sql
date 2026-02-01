-- FORCE UPDATE TO ADMIN FOR SPECIFIC USER
-- Executing this script will force the user with the email below to be an admin.

UPDATE profiles 
SET role = 'admin' 
WHERE email = 'upmarketingassessoria@gmail.com';

-- Verify the change immediately
SELECT full_name, email, role 
FROM profiles 
WHERE email = 'upmarketingassessoria@gmail.com';
