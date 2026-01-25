-- FIX 1: Allow Users to Update their Bets
-- Drop restrictive policies if conflicting
DROP POLICY IF EXISTS "Users can update their own bets" ON bets;

-- Create Permissive Policy
CREATE POLICY "Users can update their own bets"
ON bets FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- CHECK NOTIFICATIONS (Diagnostic)
-- Run this to see if the Notification actually exists in the DB
SELECT id, created_at, title, message 
FROM user_notifications 
ORDER BY created_at DESC 
LIMIT 5;
