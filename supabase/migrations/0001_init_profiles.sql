-- Core users/profiles schema, per Section 10 of the project spec.
-- Apply this via the Supabase SQL Editor, or via `supabase db push` once
-- the CLI is linked to this project.

create extension if not exists postgis;

create type account_status as enum ('active', 'deactivated', 'deleted');
create type app_role as enum ('super_admin', 'admin', 'moderator', 'support', 'user');

-- profiles: one row per auth.users row, created automatically on signup.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  bio text,
  photos text[] not null default '{}',
  visibility boolean not null default true,
  is_top_profile boolean not null default false,
  location geography(point),
  role app_role not null default 'user',
  account_status account_status not null default 'active',
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index profiles_location_idx on public.profiles using gist (location);

alter table public.profiles enable row level security;

-- Anyone signed in can read visible, active profiles (needed for Discover/Search).
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (visibility = true and account_status = 'active');

-- A user can always read and update their own profile regardless of visibility.
create policy "users can manage their own profile"
  on public.profiles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- credits: one row per user, created alongside the profile.
create table public.credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.credits enable row level security;

create policy "users can read their own credits"
  on public.credits for select
  to authenticated
  using (auth.uid() = user_id);

-- Auto-create profile + credits row whenever a new auth.users row appears.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));

  insert into public.credits (user_id, balance)
  values (new.id, 0);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
