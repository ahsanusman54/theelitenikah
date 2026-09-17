-- Voice messages: reuse `messages`, add a type + duration. `content` holds
-- either the text, or the chat-media storage path for a voice note.
alter table public.messages
  add column message_type text not null default 'text' check (message_type in ('text', 'voice')),
  add column duration_seconds integer;

-- Private bucket for voice notes (and future call-related media). Not
-- public like profile-photos -- only the two chat participants can read or
-- write files under a given chat's folder.
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do nothing;

create policy "chat participants can upload chat media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-media'
    and exists (
      select 1 from public.chats
      where id::text = (storage.foldername(name))[1]
        and (user_a = auth.uid() or user_b = auth.uid())
    )
  );

create policy "chat participants can read chat media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat-media'
    and exists (
      select 1 from public.chats
      where id::text = (storage.foldername(name))[1]
        and (user_a = auth.uid() or user_b = auth.uid())
    )
  );
