-- Create Pool Chat Messages Table
create table if not exists public.pool_chat_messages (
  id uuid primary key default uuid_generate_v4(),
  pool_id uuid references public.pools(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (length(content) > 0 and length(content) <= 500),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.pool_chat_messages enable row level security;

-- Policies

-- 1. READ: Admin or Participant
create policy "Participants can view chat"
  on public.pool_chat_messages for select
  using (
    exists (
      select 1 from public.bets 
      where bets.pool_id = pool_chat_messages.pool_id 
      and bets.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 2. INSERT: Admin or Participant (must be their own user_id)
create policy "Participants can insert messages"
  on public.pool_chat_messages for insert
  with check (
    auth.uid() = user_id
    and
    (
      exists (
        select 1 from public.bets 
        where bets.pool_id = pool_chat_messages.pool_id 
        and bets.user_id = auth.uid()
      )
      or
      exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      )
    )
  );

-- Indexes for performance
create index if not exists idx_pool_chat_pool_id on public.pool_chat_messages(pool_id);
create index if not exists idx_pool_chat_created_at on public.pool_chat_messages(created_at);
