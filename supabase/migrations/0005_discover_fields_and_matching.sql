-- Fields needed to render the Discover card honestly (age, height, weight,
-- children, drinking/smoking), plus the likes/matches tables from Section 10
-- of the spec, with auto-match-on-mutual-like enforced server-side via a
-- trigger (not left to the client, so it can't be spoofed).

create type children_status as enum ('none', 'have_children');
create type habit_level as enum ('no', 'occasionally', 'yes');

alter table public.profiles
  add column date_of_birth date,
  add column height_cm smallint,
  add column weight_kg smallint,
  add column children children_status,
  add column drinks habit_level,
  add column smokes habit_level,
  add column is_verified boolean not null default false,
  add column is_premium boolean not null default false;

create table public.likes (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  is_super boolean not null default false,
  created_at timestamptz not null default now(),
  unique (from_user, to_user)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active',
  matched_at timestamptz not null default now(),
  constraint matches_ordered check (user_a < user_b),
  unique (user_a, user_b)
);

alter table public.likes enable row level security;
alter table public.matches enable row level security;

create policy "users can see likes involving them"
  on public.likes for select
  to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user);

create policy "users can like as themselves"
  on public.likes for insert
  to authenticated
  with check (auth.uid() = from_user);

create policy "users can see their own matches"
  on public.matches for select
  to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Matches are never inserted directly by a client -- only by this trigger,
-- so mutual-match logic can't be spoofed by writing straight to the table.
create function public.handle_new_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  ordered_a uuid;
  ordered_b uuid;
begin
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

create trigger on_like_created
  after insert on public.likes
  for each row execute function public.handle_new_like();
