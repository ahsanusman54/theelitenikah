alter table public.profiles
  add column photo_privacy boolean not null default false,
  add column email_notifications_enabled boolean not null default true,
  add column push_notifications_enabled boolean not null default true;
