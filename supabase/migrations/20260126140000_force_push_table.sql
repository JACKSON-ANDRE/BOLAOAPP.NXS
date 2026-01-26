-- Force creation of the table if it doesn't exist
create table if not exists public.user_push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz default now()
);

-- RLS Policies (Idempotent check)
alter table public.user_push_subscriptions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own subscriptions') then
    create policy "Users can insert their own subscriptions"
      on public.user_push_subscriptions for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own subscriptions') then
    create policy "Users can delete their own subscriptions"
      on public.user_push_subscriptions for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- Index
create index if not exists idx_user_push_subscriptions_user_id on public.user_push_subscriptions(user_id);
