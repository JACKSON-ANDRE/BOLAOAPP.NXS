-- FORCE ENABLE DELETE FOR CHAT
-- Run this in Supabase SQL Editor

-- 1. Drop existing policy if it exists (to avoid conflicts)
drop policy if exists "Users can delete their own messages" on public.pool_chat_messages;

-- 2. Create the policy allowing DELETE
create policy "Users can delete their own messages"
  on public.pool_chat_messages for delete
  using (
    auth.uid() = user_id
    or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 3. Verify RLS is enabled
alter table public.pool_chat_messages enable row level security;
