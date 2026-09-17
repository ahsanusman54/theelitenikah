-- Replace the single email_notifications_enabled toggle with per-type
-- preferences, matching the reference's "send an email notice when..."
-- layout. Only for notification types that actually exist in this app
-- (like, super_like, match, view) -- no Groups/mentions/comments toggles,
-- since those features were never built.
alter table public.profiles
  add column email_notification_prefs jsonb not null default
    '{"like": true, "super_like": true, "match": true, "view": true}';
