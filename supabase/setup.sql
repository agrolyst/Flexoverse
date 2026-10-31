-- Flexoverse starter schema. Run once in the Supabase SQL Editor.
-- The Data API privileges below are explicit; all exposed tables use RLS.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check (username ~ '^[a-z0-9]{3,30}$'),
 full_name text not null default '', bio text not null default '' check (char_length(bio) <= 300),
 avatar_url text, is_public boolean not null default true,
 search_index_enabled boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.posts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 content text not null check (char_length(content) between 1 and 2000), image_path text,
 is_public boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.reels (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 caption text not null default '' check (char_length(caption) <= 500),
 video_path text not null unique check (char_length(video_path) between 1 and 512),
 is_public boolean not null default true, created_at timestamptz not null default now()
);
create table public.likes (
 post_id uuid not null references public.posts(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(), primary key (post_id, user_id)
);
create table public.comments (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 content text not null check (char_length(content) between 1 and 1000), created_at timestamptz not null default now()
);
create table public.friend_requests (
 id uuid primary key default gen_random_uuid(),
 from_user_id uuid not null references public.profiles(id) on delete cascade,
 to_user_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check (status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (from_user_id <> to_user_id), unique (from_user_id,to_user_id)
);
create function private.keep_friend_request_participants()
returns trigger language plpgsql set search_path = '' as $$
begin
 if new.from_user_id <> old.from_user_id or new.to_user_id <> old.to_user_id then
  raise exception 'Friend request participants cannot be changed';
 end if;
 return new;
end;
$$;
create trigger friend_request_participants_immutable before update on public.friend_requests
for each row execute function private.keep_friend_request_participants();

create table public.user_blocks (
 blocker_id uuid not null references public.profiles(id) on delete cascade,
 blocked_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(), primary key (blocker_id,blocked_id), check (blocker_id <> blocked_id)
);
create table public.conversations (
 id uuid primary key default gen_random_uuid(), created_by uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table public.conversation_members (
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 joined_at timestamptz not null default now(), primary key (conversation_id,user_id)
);
create table public.messages (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 sender_id uuid not null references public.profiles(id) on delete cascade,
 content text not null check (char_length(content) between 1 and 4000),
 created_at timestamptz not null default now(), edited_at timestamptz
);
create index posts_feed_idx on public.posts(created_at desc);
create index posts_author_idx on public.posts(user_id,created_at desc);
create index reels_feed_idx on public.reels(created_at desc);
create index reels_author_idx on public.reels(user_id,created_at desc);
create index comments_post_idx on public.comments(post_id,created_at);
create index friend_requests_recipient_idx on public.friend_requests(to_user_id,status,created_at desc);
create index messages_conversation_idx on public.messages(conversation_id,created_at);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.reels enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.friend_requests enable row level security;
alter table public.user_blocks enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy "Public profiles are readable" on public.profiles for select to anon,authenticated
using (is_public or id=(select auth.uid()));
create policy "Users create their own profile" on public.profiles for insert to authenticated
with check ((select auth.uid())=id);
create policy "Users update their own profile" on public.profiles for update to authenticated
using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy "Public posts are readable" on public.posts for select to anon,authenticated
using (is_public or user_id=(select auth.uid()));
create policy "Public can read public reels" on public.reels for select to anon,authenticated
using (
 user_id=(select auth.uid())
 or (is_public and exists(select 1 from public.profiles p where p.id=user_id and p.is_public))
);
create policy "Users create their own reels" on public.reels for insert to authenticated
with check ((select auth.uid())=user_id and split_part(video_path,'/',1)=(select auth.uid())::text);
create policy "Users delete their own reels" on public.reels for delete to authenticated
using ((select auth.uid())=user_id);
create policy "Users create their own posts" on public.posts for insert to authenticated
with check ((select auth.uid())=user_id);
create policy "Users update their own posts" on public.posts for update to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Users delete their own posts" on public.posts for delete to authenticated
using ((select auth.uid())=user_id);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('reels','reels',false,52428800,array['video/mp4','video/webm','video/quicktime']);
create policy "Read public reel videos and own videos" on storage.objects for select to anon,authenticated
using (
 bucket_id='reels'
 and (
  (storage.foldername(name))[1]=(select auth.uid())::text
  or exists(select 1 from public.reels r join public.profiles p on p.id=r.user_id where r.video_path=name and r.is_public and p.is_public)
 )
);
create policy "Users upload reel videos to their own folder" on storage.objects for insert to authenticated
with check (bucket_id='reels' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Users delete reel videos from their own folder" on storage.objects for delete to authenticated
using (bucket_id='reels' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Likes on readable posts are visible" on public.likes for select to anon,authenticated
using (exists(select 1 from public.posts p where p.id=post_id and (p.is_public or p.user_id=(select auth.uid()))));
create policy "Users like as themselves" on public.likes for insert to authenticated
with check ((select auth.uid())=user_id and exists(select 1 from public.posts p where p.id=post_id and (p.is_public or p.user_id=(select auth.uid()))));
create policy "Users remove their own likes" on public.likes for delete to authenticated
using ((select auth.uid())=user_id);
create policy "Comments on readable posts are visible" on public.comments for select to anon,authenticated
using (exists(select 1 from public.posts p where p.id=post_id and (p.is_public or p.user_id=(select auth.uid()))));
create policy "Users comment as themselves" on public.comments for insert to authenticated
with check ((select auth.uid())=user_id and exists(select 1 from public.posts p where p.id=post_id and (p.is_public or p.user_id=(select auth.uid()))));
create policy "Users edit their own comments" on public.comments for update to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Users delete their own comments" on public.comments for delete to authenticated
using ((select auth.uid())=user_id);
create policy "Participants can read friend requests" on public.friend_requests for select to authenticated
using ((select auth.uid()) in (from_user_id,to_user_id));
create policy "Users send requests as themselves" on public.friend_requests for insert to authenticated
with check ((select auth.uid())=from_user_id);
create policy "Recipients can accept or decline requests" on public.friend_requests for update to authenticated
using ((select auth.uid())=to_user_id) with check ((select auth.uid())=to_user_id and status in ('accepted','declined'));
create policy "Request sender or recipient can remove request" on public.friend_requests for delete to authenticated
using ((select auth.uid()) in (from_user_id,to_user_id));
create policy "Users can see their blocks" on public.user_blocks for select to authenticated
using ((select auth.uid())=blocker_id);
create policy "Users block accounts themselves" on public.user_blocks for insert to authenticated
with check ((select auth.uid())=blocker_id);
create policy "Users remove their own blocks" on public.user_blocks for delete to authenticated
using ((select auth.uid())=blocker_id);

-- This narrowly scoped definer function avoids recursive membership-table RLS checks.
create function private.is_conversation_member(conversation_uuid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.conversation_members m
   where m.conversation_id=conversation_uuid and m.user_id=(select auth.uid()));
$$;
revoke all on function private.is_conversation_member(uuid) from public,anon;
grant execute on function private.is_conversation_member(uuid) to authenticated;
create policy "Members can read conversations" on public.conversations for select to authenticated
using (created_by=(select auth.uid()) or private.is_conversation_member(id));
create policy "Users create conversations" on public.conversations for insert to authenticated
with check ((select auth.uid())=created_by);
create policy "Members can read their memberships" on public.conversation_members for select to authenticated
using (private.is_conversation_member(conversation_id));
create policy "Creator adds self and accepted friend" on public.conversation_members for insert to authenticated
with check (
 exists(select 1 from public.conversations c where c.id=conversation_id and c.created_by=(select auth.uid()))
 and (user_id=(select auth.uid()) or exists(
  select 1 from public.friend_requests f where f.status='accepted'
   and ((f.from_user_id=(select auth.uid()) and f.to_user_id=user_id)
    or (f.to_user_id=(select auth.uid()) and f.from_user_id=user_id))
 ))
);
create policy "Members can read messages" on public.messages for select to authenticated
using (private.is_conversation_member(conversation_id));
create policy "Members send messages as themselves" on public.messages for insert to authenticated
with check (sender_id=(select auth.uid()) and private.is_conversation_member(conversation_id));
create policy "Senders edit their own messages" on public.messages for update to authenticated
using ((select auth.uid())=sender_id) with check ((select auth.uid())=sender_id);
create policy "Senders delete their own messages" on public.messages for delete to authenticated
using ((select auth.uid())=sender_id);

-- Supabase changed default Data API exposure on 2026-10-30. Grant only the needed roles.
revoke all on table public.profiles,public.posts,public.likes,public.comments,public.friend_requests,
 public.reels,public.user_blocks,public.conversations,public.conversation_members,public.messages from public;
grant select on table public.profiles,public.posts,public.reels,public.likes,public.comments to anon;
grant select,insert,delete on table public.profiles to authenticated;
grant select,insert,delete on table public.reels to authenticated;
grant update (username,full_name,bio,avatar_url,is_public) on table public.profiles to authenticated;
grant select,insert,update,delete on table public.posts,public.likes,public.comments,
 public.friend_requests,public.user_blocks,public.conversations,public.conversation_members,public.messages to authenticated;

create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,username,full_name)
 values(new.id,lower(new.raw_user_meta_data->>'username'),coalesce(new.raw_user_meta_data->>'full_name',''));
 return new;
end;
$$;
revoke all on function private.handle_new_user() from public,anon,authenticated;
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

do $$
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and
    not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
  alter publication supabase_realtime add table public.messages;
 end if;
end;
$$;
-- RLS policies call the narrowly scoped private helper as authenticated users.
grant usage on schema private to authenticated;

-- Cover the remaining foreign keys for joins and account cleanup.
create index if not exists comments_user_idx on public.comments(user_id);
create index if not exists conversation_members_user_idx on public.conversation_members(user_id);
create index if not exists conversations_creator_idx on public.conversations(created_by);
create index if not exists likes_user_idx on public.likes(user_id);
create index if not exists messages_sender_idx on public.messages(sender_id);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);


-- Live direct messages and a private activity inbox for Flexoverse.

alter table public.conversation_members
  add column if not exists last_read_at timestamptz not null default now();

drop policy if exists "Users update own read receipts" on public.conversation_members;
create policy "Users update own read receipts" on public.conversation_members
  for update to authenticated
  using (user_id=(select auth.uid()))
  with check (user_id=(select auth.uid()));
revoke update on table public.conversation_members from authenticated;
grant update (last_read_at) on table public.conversation_members to authenticated;

create index if not exists conversation_members_user_idx
  on public.conversation_members(user_id,conversation_id);

drop policy if exists "Accepted friends can read profiles" on public.profiles;
create policy "Accepted friends can read profiles" on public.profiles
  for select to authenticated
  using (exists(
    select 1 from public.friend_requests f
    where f.status='accepted'
      and ((f.from_user_id=profiles.id and f.to_user_id=(select auth.uid()))
        or (f.to_user_id=profiles.id and f.from_user_id=(select auth.uid())))
  ));

create or replace function public.list_my_conversations()
returns table (
  conversation_id uuid,
  created_at timestamptz,
  last_read_at timestamptz,
  peer_id uuid,
  peer_username text,
  peer_name text,
  peer_avatar_url text,
  last_message_id uuid,
  last_sender_id uuid,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return;
  end if;

  return query
  select
    c.id,
    c.created_at,
    own.last_read_at,
    peer.id,
    peer.username,
    coalesce(peer.full_name,peer.username),
    peer.avatar_url,
    latest.id,
    latest.sender_id,
    latest.content,
    latest.created_at,
    (select count(*)
      from public.messages unread
      where unread.conversation_id=c.id
        and unread.sender_id<>own.user_id
        and unread.created_at>own.last_read_at)::bigint
  from public.conversation_members own
  join public.conversations c on c.id=own.conversation_id
  join lateral (
    select p.id,p.username,p.full_name,p.avatar_url
    from public.conversation_members other_member
    join public.profiles p on p.id=other_member.user_id
    where other_member.conversation_id=c.id
      and other_member.user_id<>own.user_id
    order by other_member.joined_at
    limit 1
  ) peer on true
  left join lateral (
    select m.id,m.sender_id,m.content,m.created_at
    from public.messages m
    where m.conversation_id=c.id
    order by m.created_at desc
    limit 1
  ) latest on true
  where own.user_id=(select auth.uid())
  order by coalesce(latest.created_at,c.created_at) desc;
end;
$$;
revoke all on function public.list_my_conversations() from public,anon;
grant execute on function public.list_my_conversations() to authenticated;

create or replace function public.start_direct_conversation(target_user_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  existing_id uuid;
  new_id uuid;
begin
  if caller_id is null then
    raise exception 'Sign in to start a conversation' using errcode='42501';
  end if;
  if target_user_id is null or target_user_id=caller_id then
    raise exception 'Choose a different person' using errcode='22023';
  end if;

  if not exists (
    select 1 from public.friend_requests f
    where f.status='accepted'
      and ((f.from_user_id=caller_id and f.to_user_id=target_user_id)
        or (f.to_user_id=caller_id and f.from_user_id=target_user_id))
  ) then
    raise exception 'You can only message an accepted friend' using errcode='42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    least(caller_id::text,target_user_id::text)||':'||greatest(caller_id::text,target_user_id::text),0));

  select c.id into existing_id
  from public.conversations c
  where exists(select 1 from public.conversation_members m where m.conversation_id=c.id and m.user_id=caller_id)
    and exists(select 1 from public.conversation_members m where m.conversation_id=c.id and m.user_id=target_user_id)
    and (select count(*) from public.conversation_members m where m.conversation_id=c.id)=2
  order by c.created_at desc
  limit 1;
  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.conversations(created_by) values(caller_id) returning id into new_id;
  insert into public.conversation_members(conversation_id,user_id)
    values(new_id,caller_id),(new_id,target_user_id);
  return new_id;
end;
$$;
revoke all on function public.start_direct_conversation(uuid) from public,anon;
grant execute on function public.start_direct_conversation(uuid) to authenticated;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check(type in ('friend_request','friend_accepted','post_like','post_comment')),
  target_id uuid,
  preview text not null default '' check(char_length(preview)<=240),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on public.notifications(recipient_id,created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications(recipient_id,created_at desc) where not is_read;
create index if not exists notifications_actor_idx
  on public.notifications(actor_id,created_at desc);

alter table public.notifications enable row level security;
revoke all on table public.notifications from public,anon,authenticated;
grant select on table public.notifications to authenticated;
grant update (is_read) on table public.notifications to authenticated;

drop policy if exists "Users read their notifications" on public.notifications;
create policy "Users read their notifications" on public.notifications
  for select to authenticated using(recipient_id=(select auth.uid()));
drop policy if exists "Users mark their notifications read" on public.notifications;
create policy "Users mark their notifications read" on public.notifications
  for update to authenticated
  using(recipient_id=(select auth.uid()))
  with check(recipient_id=(select auth.uid()));

create or replace function private.notify_friend_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op='INSERT' and new.status='pending' then
    insert into public.notifications(recipient_id,actor_id,type,target_id)
    values(new.to_user_id,new.from_user_id,'friend_request',new.id);
  elsif tg_op='UPDATE' and old.status='pending' and new.status='accepted' then
    insert into public.notifications(recipient_id,actor_id,type,target_id)
    values(new.from_user_id,new.to_user_id,'friend_accepted',new.id);
  end if;
  return new;
end;
$$;
revoke all on function private.notify_friend_request() from public,anon,authenticated;
drop trigger if exists notify_friend_request on public.friend_requests;
create trigger notify_friend_request
  after insert or update of status on public.friend_requests
  for each row execute function private.notify_friend_request();

create or replace function private.notify_post_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_owner uuid;
begin
  select p.user_id into post_owner from public.posts p where p.id=new.post_id;
  if post_owner is not null and post_owner<>new.user_id then
    insert into public.notifications(recipient_id,actor_id,type,target_id)
    values(post_owner,new.user_id,'post_like',new.post_id);
  end if;
  return new;
end;
$$;
revoke all on function private.notify_post_like() from public,anon,authenticated;
drop trigger if exists notify_post_like on public.likes;
create trigger notify_post_like after insert on public.likes
  for each row execute function private.notify_post_like();

create or replace function private.notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_owner uuid;
begin
  select p.user_id into post_owner from public.posts p where p.id=new.post_id;
  if post_owner is not null and post_owner<>new.user_id then
    insert into public.notifications(recipient_id,actor_id,type,target_id,preview)
    values(post_owner,new.user_id,'post_comment',new.post_id,left(new.content,240));
  end if;
  return new;
end;
$$;
revoke all on function private.notify_post_comment() from public,anon,authenticated;
drop trigger if exists notify_post_comment on public.comments;
create trigger notify_post_comment after insert on public.comments
  for each row execute function private.notify_post_comment();

do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and
     not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
