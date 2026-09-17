-- Admin panel core: audit logging on sensitive actions, report review with
-- optional enforcement action, and admin read access to chats/messages for
-- moderating reported conversations. Everything here is gated through
-- current_user_is_staff() (the same SECURITY DEFINER helper already used
-- for the profiles admin policy, which avoids the RLS recursion bug from
-- before) and logged to audit_log so every admin action is traceable.

-- Admin read access to chats/messages -- needed to investigate reported
-- conversations. This is a real, significant capability: any admin/
-- moderator can read any user's message content. Gated to staff only,
-- and every review action taken from it is audit-logged below.
create policy "admins can read all chats"
  on public.chats for select
  to authenticated
  using (public.current_user_is_staff());

create policy "admins can read all messages"
  on public.messages for select
  to authenticated
  using (public.current_user_is_staff());

create policy "admins can read all blocks"
  on public.blocks for select
  to authenticated
  using (public.current_user_is_staff());

-- Report review, with audit logging and an optional enforcement action
-- taken atomically with the review (so "reviewed + suspended" is one
-- traceable step, not two separate unlinked writes).
create function public.admin_review_report(
  p_report_id uuid,
  p_new_status report_status,
  p_action text default null -- null | 'deactivate' | 'delete'
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  rpt record;
  is_admin boolean;
begin
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role in ('admin', 'super_admin', 'moderator')
  ) into is_admin;

  if not is_admin then
    raise exception 'Not authorized to review reports';
  end if;

  select * into rpt from public.reports where id = p_report_id;
  if not found then
    raise exception 'Report not found';
  end if;

  update public.reports set status = p_new_status where id = p_report_id;

  perform set_config('app.trusted_write', 'true', true);

  if p_action = 'deactivate' then
    update public.profiles set account_status = 'deactivated' where user_id = rpt.reported_id;
  elsif p_action = 'delete' then
    update public.profiles set account_status = 'deleted' where user_id = rpt.reported_id;
  end if;

  insert into public.audit_log (admin_user_id, action, target_table, target_id, old_value, new_value)
  values (
    auth.uid(), 'review_report', 'reports', p_report_id::text,
    jsonb_build_object('status', rpt.status),
    jsonb_build_object('status', p_new_status, 'action', p_action)
  );
end;
$$;

grant execute on function public.admin_review_report(uuid, report_status, text) to authenticated;

-- Add audit logging to the two admin functions built earlier, which
-- didn't log anything yet.
create or replace function public.admin_update_user_role(p_target_user_id uuid, p_new_role app_role)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  caller_role app_role;
  old_role app_role;
begin
  select role into caller_role from public.profiles where user_id = auth.uid();
  if caller_role <> 'super_admin' then
    raise exception 'Only a super admin can change user roles';
  end if;

  select role into old_role from public.profiles where user_id = p_target_user_id;

  perform set_config('app.trusted_write', 'true', true);
  update public.profiles set role = p_new_role where user_id = p_target_user_id;

  insert into public.audit_log (admin_user_id, action, target_table, target_id, old_value, new_value)
  values (auth.uid(), 'update_user_role', 'profiles', p_target_user_id::text,
    jsonb_build_object('role', old_role), jsonb_build_object('role', p_new_role));
end;
$$;

create or replace function public.admin_update_account_status(p_target_user_id uuid, p_new_status account_status)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  caller_role app_role;
  old_status account_status;
begin
  select role into caller_role from public.profiles where user_id = auth.uid();
  if caller_role not in ('admin', 'super_admin') then
    raise exception 'Not authorized to change account status';
  end if;

  select account_status into old_status from public.profiles where user_id = p_target_user_id;

  perform set_config('app.trusted_write', 'true', true);
  update public.profiles set account_status = p_new_status where user_id = p_target_user_id;

  insert into public.audit_log (admin_user_id, action, target_table, target_id, old_value, new_value)
  values (auth.uid(), 'update_account_status', 'profiles', p_target_user_id::text,
    jsonb_build_object('account_status', old_status), jsonb_build_object('account_status', p_new_status));
end;
$$;

-- Feature flags / app settings writes should be audit-logged too. The
-- existing "admins can write" policies let staff update these tables
-- directly (no RPC), so log via a trigger instead of wrapping every write
-- in a function.
create function public.log_settings_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.audit_log (admin_user_id, action, target_table, target_id, old_value, new_value)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(new.id, old.id)::text,
    to_jsonb(old),
    to_jsonb(new)
  );
  return coalesce(new, old);
end;
$$;

create trigger log_feature_flags_change
  after insert or update on public.feature_flags
  for each row execute function public.log_settings_change();

create trigger log_app_settings_change
  after insert or update on public.app_settings
  for each row execute function public.log_settings_change();
