-- Create table to store user push subscriptions
create table if not exists user_push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz default now()
);

-- RLS Policies
alter table user_push_subscriptions enable row level security;

create policy "Users can insert their own subscriptions"
  on user_push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own subscriptions"
  on user_push_subscriptions for delete
  using (auth.uid() = user_id);

-- Index for faster lookups
create index idx_user_push_subscriptions_user_id on user_push_subscriptions(user_id);
