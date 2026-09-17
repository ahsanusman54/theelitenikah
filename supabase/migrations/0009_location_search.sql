-- Lets a user store their own coordinates (captured via the browser's
-- Geolocation API, never typed/geocoded -- no geocoding API key available)
-- and search other visible/active profiles within a radius of themself.

create function public.update_my_location(lat double precision, lng double precision)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  where user_id = auth.uid();
end;
$$;

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
    p.date_of_birth,
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

grant execute on function public.update_my_location(double precision, double precision) to authenticated;
grant execute on function public.search_nearby_profiles(double precision) to authenticated;
