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
