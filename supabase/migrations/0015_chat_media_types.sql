-- Extend messages to support image/video/file attachments alongside the
-- existing text and voice types. `content` holds the chat-media storage
-- path for any non-text type (same convention as voice notes already use).
alter table public.messages drop constraint messages_message_type_check;
alter table public.messages add constraint messages_message_type_check
  check (message_type in ('text', 'voice', 'image', 'video', 'file'));

alter table public.messages add column file_name text;
