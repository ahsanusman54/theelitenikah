-- Fixes infinite recursion in "admins can read all profiles" (added in
-- 0019): a policy defined ON profiles that queries profiles directly
-- forces Postgres to re-evaluate every SELECT policy on profiles again to
-- resolve the subquery -- including that same policy -- looping forever.
--
-- The fix is the same pattern already used for is_blocked(): move the
-- check into a SECURITY DEFINER function. Functions created here are
-- owned by the table-owning role, which bypasses RLS for its own internal
-- queries, so the lookup inside doesn't re-trigger policy evaluation.
create function public.current_user_is_staff()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role in ('admin', 'super_admin', 'moderator')
  );
$$;

drop policy "admins can read all profiles" on public.profiles;

create policy "admins can read all profiles"
  on public.profiles for select
  to authenticated
  using (public.current_user_is_staff());
