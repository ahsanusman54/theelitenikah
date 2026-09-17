-- Replaces the binary visibility boolean with three tiers: everyone,
-- matches_only, only_me.
--
-- Design note on "matches_only": it can't mean "excluded from Discover/
-- Search entirely" -- if no one could ever find you, no one could ever
-- match with you, making the setting permanently unreachable. Instead,
-- matches_only profiles still appear in listings (so matching is still
-- possible), but the full profile detail page only shows full information
-- to people you've actually matched with -- enforced in the app layer,
-- since it depends on match status between two specific users, not
-- something a single-row RLS policy can express.
alter table public.profiles add column profile_visibility text not null default 'everyone'
  check (profile_visibility in ('everyone', 'matches_only', 'only_me'));

update public.profiles set profile_visibility = case when visibility then 'everyone' else 'only_me' end;

alter policy "profiles are readable by authenticated users"
  on public.profiles
  using (
    profile_visibility <> 'only_me'
    and account_status = 'active'
    and not public.is_blocked(auth.uid(), user_id)
  );

alter policy "active stories from visible profiles are readable"
  on public.stories
  using (
    expires_at > now()
    and exists (
      select 1 from public.profiles
      where user_id = stories.user_id and profile_visibility <> 'only_me' and account_status = 'active'
    )
  );

alter table public.profiles drop column visibility;
