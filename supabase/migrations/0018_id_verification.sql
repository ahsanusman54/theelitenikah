-- ID verification: private document storage, a request/review table, and
-- approve/reject functions that flip is_verified through the same
-- trusted-write mechanism as everything else that shouldn't be
-- client-writable directly.

insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do nothing;

create policy "users can upload their own verification documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users and admins can read verification documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'verification-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles
        where user_id = auth.uid() and role in ('admin', 'super_admin', 'moderator')
      )
    )
  );

create type verification_status as enum ('pending', 'approved', 'rejected');
create type verification_doc_type as enum ('cnic', 'passport', 'nin', 'ssn');

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type verification_doc_type not null,
  document_number text not null,
  document_path text not null,
  status verification_status not null default 'pending',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.verification_requests enable row level security;

create policy "users can see their own verification requests"
  on public.verification_requests for select
  to authenticated
  using (user_id = auth.uid());

create policy "users can submit their own verification requests"
  on public.verification_requests for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "admins can see all verification requests"
  on public.verification_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'super_admin', 'moderator')
    )
  );

create function public.review_verification(p_request_id uuid, p_approve boolean)
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
  end if;
end;
$$;

grant execute on function public.review_verification(uuid, boolean) to authenticated;

-- Nobody has admin access yet, so the review step above would be
-- unreachable. Promoting the one existing account (the project owner,
-- testing this end to end) to super_admin so this is actually usable.
select set_config('app.trusted_write', 'true', true);
update public.profiles set role = 'super_admin' where name = 'ahsan';
