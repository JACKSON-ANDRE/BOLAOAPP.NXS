-- Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON user_push_subscriptions;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON user_push_subscriptions;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_push_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON user_push_subscriptions;
DROP POLICY IF EXISTS "Users can select their own subscription" ON user_push_subscriptions;

-- Enable RLS
ALTER TABLE user_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy for INSERT: Allow user to insert IF the user_id matches their own ID
CREATE POLICY "Users can insert their own subscription"
ON user_push_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for SELECT: Allow user to see their own subscription
CREATE POLICY "Users can select their own subscription"
ON user_push_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy for UPDATE: Allow user to update their own subscription
CREATE POLICY "Users can update their own subscription"
ON user_push_subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for DELETE: Allow user to delete their own subscription
CREATE POLICY "Users can delete their own subscription"
ON user_push_subscriptions
FOR DELETE
USING (auth.uid() = user_id);
