create type report_status as enum ('pending', 'reviewed', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status report_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

alter table public.reports enable row level security;
alter table public.blocks enable row level security;

create policy "users can file reports as themselves"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy "users can see their own filed reports"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid());

create policy "admins can see all reports"
  on public.reports for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'super_admin', 'moderator')
    )
  );

create policy "users can block as themselves"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = auth.uid());

create policy "users can see blocks they created"
  on public.blocks for select
  to authenticated
  using (blocker_id = auth.uid());

create policy "users can remove their own blocks"
  on public.blocks for delete
  to authenticated
  using (blocker_id = auth.uid());

-- Security-definer helper: RLS on `blocks` only lets someone see blocks
-- *they* created (so a blocked person can't tell they've been blocked),
-- but other tables' policies still need to check both directions of a
-- block. This bypasses RLS internally to do that check safely.
create function public.is_blocked(user_a uuid, user_b uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = user_a and blocked_id = user_b)
       or (blocker_id = user_b and blocked_id = user_a)
  );
$$;

-- Enforce blocks in the three places it matters: browsing, liking, messaging.
alter policy "profiles are readable by authenticated users"
  on public.profiles
  using (
    visibility = true
    and account_status = 'active'
    and not public.is_blocked(auth.uid(), user_id)
  );

alter policy "users can like as themselves"
  on public.likes
  with check (auth.uid() = from_user and not public.is_blocked(auth.uid(), to_user));

alter policy "participants can send messages in their chats"
  on public.messages
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chats
      where id = chat_id and (user_a = auth.uid() or user_b = auth.uid())
    )
    and not public.is_blocked(
      auth.uid(),
      (select case when user_a = auth.uid() then user_b else user_a end from public.chats where id = chat_id)
    )
  );
