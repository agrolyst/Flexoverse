-- Reels: private video storage with access limited to public reels and their owners.
create table if not exists public.reels (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 caption text not null default '' check (char_length(caption) <= 500),
 video_path text not null unique check (char_length(video_path) between 1 and 512),
 is_public boolean not null default true,
 created_at timestamptz not null default now()
);

create index if not exists reels_feed_idx on public.reels(created_at desc);
create index if not exists reels_author_idx on public.reels(user_id,created_at desc);

alter table public.reels enable row level security;
revoke all on table public.reels from public;
grant select on table public.reels to anon;
grant select,insert,delete on table public.reels to authenticated;

drop policy if exists "Public can read public reels" on public.reels;
create policy "Public can read public reels" on public.reels for select to anon,authenticated
using (
 user_id=(select auth.uid())
 or (is_public and exists(select 1 from public.profiles p where p.id=user_id and p.is_public))
);
drop policy if exists "Users create their own reels" on public.reels;
create policy "Users create their own reels" on public.reels for insert to authenticated
with check (
 (select auth.uid())=user_id
 and split_part(video_path,'/',1)=(select auth.uid())::text
);
drop policy if exists "Users delete their own reels" on public.reels;
create policy "Users delete their own reels" on public.reels for delete to authenticated
using ((select auth.uid())=user_id);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('reels','reels',false,52428800,array['video/mp4','video/webm','video/quicktime'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Read public reel videos and own videos" on storage.objects;
create policy "Read public reel videos and own videos" on storage.objects for select to anon,authenticated
using (
 bucket_id='reels'
 and (
  (storage.foldername(name))[1]=(select auth.uid())::text
  or exists(
   select 1 from public.reels r join public.profiles p on p.id=r.user_id
   where r.video_path=name and r.is_public and p.is_public
  )
 )
);
drop policy if exists "Users upload reel videos to their own folder" on storage.objects;
create policy "Users upload reel videos to their own folder" on storage.objects for insert to authenticated
with check (bucket_id='reels' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Users delete reel videos from their own folder" on storage.objects;
create policy "Users delete reel videos from their own folder" on storage.objects for delete to authenticated
using (bucket_id='reels' and (storage.foldername(name))[1]=(select auth.uid())::text);
