-- Profile views ("Who's viewed me"), and a real notification system for
-- likes, matches, and views. Email dispatch is a separate, later step --
-- see conversation notes: needs a transactional email provider this
-- project doesn't have credentials for yet. This migration builds the
-- complete trigger/data layer so adding email later is a small addition.

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references auth.users(id) on delete cascade,
  visited_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (visitor_id, visited_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('like', 'super_like', 'match', 'view')),
  content text not null,
  related_user_id uuid references auth.users(id) on delete set null,
  read_status boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.visits enable row level security;
alter table public.notifications enable row level security;

-- You can see who viewed you; you can also record your own visits.
create policy "users can see who viewed them"
  on public.visits for select
  to authenticated
  using (visited_id = auth.uid());

create policy "users can record their own visits"
  on public.visits for insert
  to authenticated
  with check (visitor_id = auth.uid());

create policy "users can update their own visit timestamp"
  on public.visits for update
  to authenticated
  using (visitor_id = auth.uid());

-- Notifications are only ever written by triggers (security definer), never
-- inserted directly by a client -- so no one can spoof a fake notification.
create policy "users can see their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "users can mark their own notifications read"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Extend the existing like trigger: notify the recipient, and don't record
-- a visit as also being a "like" notification (separate concerns).
create or replace function public.handle_new_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  ordered_a uuid;
  ordered_b uuid;
  liker_name text;
begin
  select name into liker_name from public.profiles where user_id = new.from_user;

  insert into public.notifications (user_id, type, content, related_user_id)
  values (
    new.to_user,
    case when new.is_super then 'super_like' else 'like' end,
    coalesce(liker_name, 'Someone') || case when new.is_super then ' super-liked you!' else ' liked you.' end,
    new.from_user
  );

  if exists (
    select 1 from public.likes
    where from_user = new.to_user and to_user = new.from_user
  ) then
    if new.from_user < new.to_user then
      ordered_a := new.from_user;
      ordered_b := new.to_user;
    else
      ordered_a := new.to_user;
      ordered_b := new.from_user;
    end if;

    insert into public.matches (user_a, user_b)
    values (ordered_a, ordered_b)
    on conflict (user_a, user_b) do nothing;
  end if;

  return new;
end;
$$;

-- Notify both people when a match is created (separate from the like
-- notification -- "it's a match" reads differently than "X liked you").
create or replace function public.handle_new_match()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  name_a text;
  name_b text;
begin
  select name into name_a from public.profiles where user_id = new.user_a;
  select name into name_b from public.profiles where user_id = new.user_b;

  insert into public.chats (user_a, user_b)
  values (new.user_a, new.user_b)
  on conflict (user_a, user_b) do nothing;

  insert into public.notifications (user_id, type, content, related_user_id)
  values
    (new.user_a, 'match', 'You matched with ' || coalesce(name_b, 'someone') || '!', new.user_b),
    (new.user_b, 'match', 'You matched with ' || coalesce(name_a, 'someone') || '!', new.user_a);

  return new;
end;
$$;

-- New visit -> notify the person who was viewed. Because `visits` has a
-- unique(visitor_id, visited_id) with upsert semantics in the app, this
-- AFTER INSERT trigger only fires for a genuinely new view, not repeats
-- (a conflict resolves as an UPDATE, which this trigger doesn't listen to).
create function public.handle_new_visit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  visitor_name text;
begin
  select name into visitor_name from public.profiles where user_id = new.visitor_id;

  insert into public.notifications (user_id, type, content, related_user_id)
  values (new.visited_id, 'view', coalesce(visitor_name, 'Someone') || ' viewed your profile.', new.visitor_id);

  return new;
end;
$$;

create trigger on_visit_created
  after insert on public.visits
  for each row execute function public.handle_new_visit();
