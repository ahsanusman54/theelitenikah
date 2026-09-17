-- Admin user management: change a user's role or account status through
-- secure functions, instead of needing direct database access for every
-- change (which is how ahsan's own super_admin promotion had to happen).

create function public.admin_update_user_role(p_target_user_id uuid, p_new_role app_role)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  caller_role app_role;
begin
  select role into caller_role from public.profiles where user_id = auth.uid();

  -- Only super_admin can grant/revoke roles -- matches the permissions
  -- table in the spec (regular admins manage users/content, not other
  -- staff members' access).
  if caller_role <> 'super_admin' then
    raise exception 'Only a super admin can change user roles';
  end if;

  perform set_config('app.trusted_write', 'true', true);
  update public.profiles set role = p_new_role where user_id = p_target_user_id;
end;
$$;

create function public.admin_update_account_status(p_target_user_id uuid, p_new_status account_status)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  caller_role app_role;
begin
  select role into caller_role from public.profiles where user_id = auth.uid();

  if caller_role not in ('admin', 'super_admin') then
    raise exception 'Not authorized to change account status';
  end if;

  perform set_config('app.trusted_write', 'true', true);
  update public.profiles set account_status = p_new_status where user_id = p_target_user_id;
end;
$$;

grant execute on function public.admin_update_user_role(uuid, app_role) to authenticated;
grant execute on function public.admin_update_account_status(uuid, account_status) to authenticated;

-- Admins need to be able to list/search users -- the existing "profiles
-- are readable" policy only shows visible+active, non-blocked profiles,
-- which would hide deactivated/hidden accounts from admin view entirely.
create policy "admins can read all profiles"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles admin_check
      where admin_check.user_id = auth.uid() and admin_check.role in ('admin', 'super_admin', 'moderator')
    )
  );
