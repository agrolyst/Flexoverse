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
create index comments_post_idx on public.comments(post_id,created_at);
create index friend_requests_recipient_idx on public.friend_requests(to_user_id,status,created_at desc);
create index messages_conversation_idx on public.messages(conversation_id,created_at);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
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
create policy "Users create their own posts" on public.posts for insert to authenticated
with check ((select auth.uid())=user_id);
create policy "Users update their own posts" on public.posts for update to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Users delete their own posts" on public.posts for delete to authenticated
using ((select auth.uid())=user_id);
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
 public.user_blocks,public.conversations,public.conversation_members,public.messages from public;
grant select on table public.profiles,public.posts,public.likes,public.comments to anon;
grant select,insert,delete on table public.profiles to authenticated;
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

