-- Stories: short-lived (24h) photo posts shown in a row at the top of the
-- Match page, per the reference design.

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_url text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

alter table public.stories enable row level security;

-- Anyone can see active (non-expired) stories from visible/active profiles.
create policy "active stories from visible profiles are readable"
  on public.stories for select
  to authenticated
  using (
    expires_at > now()
    and exists (
      select 1 from public.profiles
      where user_id = stories.user_id and visibility = true and account_status = 'active'
    )
  );

-- Owners can always see and manage their own stories, expired or not.
create policy "users can manage their own stories"
  on public.stories for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
