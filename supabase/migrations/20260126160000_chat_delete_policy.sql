-- Allow users to delete their own messages
create policy "Users can delete their own messages"
  on public.pool_chat_messages for delete
  using (
    auth.uid() = user_id
    or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
