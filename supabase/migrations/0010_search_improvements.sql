-- 1. Privacy fix: round stored coordinates to ~1.1km precision (2 decimal
--    places) instead of exact GPS. Distance search still works fine at
--    this precision; storing exact coordinates was more precise than this
--    app needs.
create or replace function public.update_my_location(lat double precision, lng double precision)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set location = ST_SetSRID(
    ST_MakePoint(round(lng::numeric, 2)::float8, round(lat::numeric, 2)::float8),
    4326
  )::geography
  where user_id = auth.uid();
end;
$$;

-- 2. Return the richer matrimonial fields too, so Search can show and
--    filter on them without a second round-trip. Postgres won't let
--    CREATE OR REPLACE change a function's return columns, so drop first.
drop function if exists public.search_nearby_profiles(double precision);

create function public.search_nearby_profiles(max_km double precision)
returns table (
  user_id uuid,
  name text,
  bio text,
  photos text[],
  is_verified boolean,
  is_premium boolean,
  is_online boolean,
  date_of_birth date,
  marital_status text,
  religious_practice text,
  willing_to_relocate boolean,
  children text,
  drinks text,
  smokes text,
  distance_km double precision
)
language plpgsql
security definer set search_path = public
as $$
declare
  my_location geography;
begin
  select location into my_location from public.profiles where user_id = auth.uid();

  if my_location is null then
    raise exception 'Your location is not set yet. Enable location first.';
  end if;

  return query
  select
    p.user_id, p.name, p.bio, p.photos, p.is_verified, p.is_premium, p.is_online,
    p.date_of_birth, p.marital_status::text, p.religious_practice::text,
    p.willing_to_relocate, p.children::text, p.drinks::text, p.smokes::text,
    ST_Distance(p.location, my_location) / 1000.0 as distance_km
  from public.profiles p
  where p.user_id <> auth.uid()
    and p.visibility = true
    and p.account_status = 'active'
    and p.location is not null
    and ST_DWithin(p.location, my_location, max_km * 1000)
  order by distance_km asc;
end;
$$;

grant execute on function public.search_nearby_profiles(double precision) to authenticated;
