-- Two real gaps: approving a verification request never notified the
-- user, and new messages never triggered a notification at all. Adding
-- both properly, plus simplifying email_notification_prefs to match the
-- reference's grouping (likes + super-likes combined into one "likes"
-- preference, since splitting them was more granular than useful).

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'super_like', 'match', 'view', 'message', 'verification'));

create or replace function public.review_verification(p_request_id uuid, p_approve boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  req record;
  is_admin boolean;
begin
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role in ('admin', 'super_admin', 'moderator')
  ) into is_admin;

  if not is_admin then
    raise exception 'Not authorized to review verification requests';
  end if;

  select * into req from public.verification_requests where id = p_request_id and status = 'pending';
  if not found then
    raise exception 'Request not found or already reviewed';
  end if;

  update public.verification_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_request_id;

  if p_approve then
    perform set_config('app.trusted_write', 'true', true);
    update public.profiles set is_verified = true where user_id = req.user_id;

    insert into public.notifications (user_id, type, content)
    values (req.user_id, 'verification', 'Your account has been verified!');
  end if;
end;
$$;

create function public.handle_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  recipient_id uuid;
  sender_name text;
begin
  select case when user_a = new.sender_id then user_b else user_a end
  into recipient_id
  from public.chats where id = new.chat_id;

  select name into sender_name from public.profiles where user_id = new.sender_id;

  insert into public.notifications (user_id, type, content, related_user_id)
  values (recipient_id, 'message', coalesce(sender_name, 'Someone') || ' sent you a message.', new.sender_id);

  return new;
end;
$$;

create trigger on_message_created
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- Migrate existing prefs to the simplified shape.
update public.profiles
set email_notification_prefs = jsonb_build_object(
  'verification', true,
  'new_messages', true,
  'new_visitors', coalesce((email_notification_prefs->>'view')::boolean, true),
  'likes', coalesce((email_notification_prefs->>'like')::boolean, true),
  'new_matches', coalesce((email_notification_prefs->>'match')::boolean, true),
  'promotions', true
);

alter table public.profiles alter column email_notification_prefs set default
  '{"verification": true, "new_messages": true, "new_visitors": true, "likes": true, "new_matches": true, "promotions": true}';
