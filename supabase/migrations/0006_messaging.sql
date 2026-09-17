-- Realtime chat, gated by mutual match (see conversation notes: unlike the
-- reference design, messaging here requires a match first, not open to any
-- stranger -- a deliberate safety choice for a matrimonial platform).

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint chats_ordered check (user_a < user_b),
  unique (user_a, user_b)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  sent_at timestamptz not null default now()
);

alter table public.profiles add column is_online boolean not null default false;

alter table public.chats enable row level security;
alter table public.messages enable row level security;

create policy "participants can see their chats"
  on public.chats for select
  to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "participants can read messages in their chats"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.chats
      where id = chat_id and (user_a = auth.uid() or user_b = auth.uid())
    )
  );

create policy "participants can send messages in their chats"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chats
      where id = chat_id and (user_a = auth.uid() or user_b = auth.uid())
    )
  );

-- A chat is created automatically the moment a match happens -- never
-- created directly by a client, so you can't open a chat with someone
-- who hasn't matched with you.
create function public.handle_new_match()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.chats (user_a, user_b)
  values (new.user_a, new.user_b)
  on conflict (user_a, user_b) do nothing;
  return new;
end;
$$;

create trigger on_match_created
  after insert on public.matches
  for each row execute function public.handle_new_match();

-- Enable Realtime so new messages appear live without a page refresh.
alter publication supabase_realtime add table public.messages;
