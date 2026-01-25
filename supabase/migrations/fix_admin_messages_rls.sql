-- FIX: ADMIN MESSAGES PERMISSIONS
-- Grant full access to 'admin_messages' for admins.

-- 1. Enable RLS (Good practice)
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- 2. Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can do everything on admin_messages" ON admin_messages;
DROP POLICY IF EXISTS "Users can read messages targeted to them" ON admin_messages;

-- 3. Create Policy: Admins can INSERT, SELECT, DELETE
CREATE POLICY "Admins can do everything on admin_messages"
ON admin_messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 4. Create Policy: Users can VIEW messages sent to them (or broadcast messages)
CREATE POLICY "Users can read own messages"
ON admin_messages
FOR SELECT
USING (
  target_user_id IS NULL -- Broadcast
  OR 
  target_user_id = auth.uid() -- Targeted
);
