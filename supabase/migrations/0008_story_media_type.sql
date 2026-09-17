alter table public.stories add column media_type text not null default 'image' check (media_type in ('image', 'video'));
