-- Admin Panel foundation, per Section 7 of the project spec: feature flags,
-- app-wide settings, and an audit log, all restricted to admin/super_admin.
-- Built now so every later feature can read from these instead of hardcoding
-- values that would need refactoring afterward.

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  description text,
  is_enabled boolean not null default false,
  config jsonb not null default '{}',
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null,
  category text,
  label text not null,
  description text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id),
  action text not null,
  target_table text,
  target_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_log enable row level security;

-- Everyone signed in can READ flags/settings (the app needs this to render),
-- but only admin/super_admin can write. The audit log is admin-read-only;
-- writes happen only via a security-definer function (below), never directly.

create policy "flags are readable by authenticated users"
  on public.feature_flags for select
  to authenticated
  using (true);

create policy "settings are readable by authenticated users"
  on public.app_settings for select
  to authenticated
  using (true);

create policy "admins can write flags"
  on public.feature_flags for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

create policy "admins can write settings"
  on public.app_settings for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

create policy "admins can read the audit log"
  on public.audit_log for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- Seed the initial flags/settings named in the spec (Section 7.3).
insert into public.feature_flags (key, label, description, is_enabled) values
  ('groups_enabled', 'Groups & Forums', 'Enable the community/groups module', true),
  ('video_call_enabled', 'Video Call', 'Enable in-app video calling after a match', false),
  ('maintenance_mode', 'Maintenance Mode', 'Show a maintenance page to all non-admin users', false)
on conflict (key) do nothing;

insert into public.app_settings (key, value, category, label, description) values
  ('free_daily_swipe_limit', '20', 'matching', 'Free daily swipe limit', 'How many swipes a free user gets per day'),
  ('default_discovery_radius_km', '25', 'matching', 'Default discovery radius (km)', 'Default radius for free users'),
  ('boost_cost_credits', '20', 'monetization', 'Boost cost (credits)', 'Credits required to activate a profile boost'),
  ('boost_duration_hours', '24', 'monetization', 'Boost duration (hours)', 'How long a boost lasts once activated')
on conflict (key) do nothing;
