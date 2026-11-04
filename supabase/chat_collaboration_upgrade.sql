-- Flexoverse collaboration upgrade: group roles, message mentions, and call-channel authorization.
-- Run this migration in the Supabase SQL Editor after the existing chat migrations.

alter table public.conversation_members
  add column if not exists role text not null default 'member'
  check (role in ('admin','member'));

-- The creator is the first group administrator. Existing direct chats remain members.
update public.conversation_members cm
set role='admin'
from public.conversations c
where c.id=cm.conversation_id
  and c.created_by=cm.user_id
  and coalesce(c.is_group,false)=true;

-- Group participants can see the profiles of other participants in the same group.
drop policy if exists "Group members can read fellow member profiles" on public.profiles;
create policy "Group members can read fellow member profiles" on public.profiles
for select to authenticated
using (
  exists (
    select 1
    from public.conversation_members mine
    join public.conversation_members peer
      on peer.conversation_id=mine.conversation_id
    join public.conversations c on c.id=mine.conversation_id
    where mine.user_id=(select auth.uid())
      and peer.user_id=profiles.id
      and coalesce(c.is_group,false)=true
  )
);

-- Recreate membership insertion so only the creator can add accepted friends,
-- and only the creator's own membership can be assigned the admin role.
drop policy if exists "Creator adds self and accepted friend" on public.conversation_members;
create policy "Creator adds self and accepted friend" on public.conversation_members
for insert to authenticated
with check (
  exists (
    select 1 from public.conversations c
    where c.id=conversation_id
      and c.created_by=(select auth.uid())
  )
  and exists (
    select 1 from public.conversations c
    where c.id=conversation_id
      and (
        (
          coalesce(c.is_group,false)=true
          and (
            (user_id=(select auth.uid()) and role='admin')
            or (
              user_id<>(select auth.uid()) and role='member'
              and exists (
                select 1 from public.friend_requests f
                where f.status='accepted'
                  and (
                    (f.from_user_id=(select auth.uid()) and f.to_user_id=user_id)
                    or (f.to_user_id=(select auth.uid()) and f.from_user_id=user_id)
                  )
              )
            )
          )
        )
        or (
          coalesce(c.is_group,false)=false
          and role='member'
          and (
            user_id=(select auth.uid())
            or exists (
              select 1 from public.friend_requests f
              where f.status='accepted'
                and (
                  (f.from_user_id=(select auth.uid()) and f.to_user_id=user_id)
                  or (f.to_user_id=(select auth.uid()) and f.from_user_id=user_id)
                )
            )
          )
        )
      )
  )
);

drop policy if exists "Group admins update member roles" on public.conversation_members;
create policy "Group admins update member roles" on public.conversation_members
for update to authenticated
using (
  exists (
    select 1 from public.conversation_members admin_member
    join public.conversations c on c.id=admin_member.conversation_id
    where admin_member.conversation_id=conversation_members.conversation_id
      and admin_member.user_id=(select auth.uid())
      and admin_member.role='admin'
      and coalesce(c.is_group,false)=true
  )
)
with check (
  role in ('admin','member')
  and exists (
    select 1 from public.conversation_members admin_member
    join public.conversations c on c.id=admin_member.conversation_id
    where admin_member.conversation_id=conversation_members.conversation_id
      and admin_member.user_id=(select auth.uid())
      and admin_member.role='admin'
      and coalesce(c.is_group,false)=true
  )
);

drop policy if exists "Group admins remove members" on public.conversation_members;
create policy "Group admins remove members" on public.conversation_members
for delete to authenticated
using (
  user_id<>(select auth.uid())
  and exists (
    select 1 from public.conversation_members admin_member
    join public.conversations c on c.id=admin_member.conversation_id
    where admin_member.conversation_id=conversation_members.conversation_id
      and admin_member.user_id=(select auth.uid())
      and admin_member.role='admin'
      and coalesce(c.is_group,false)=true
  )
);

grant select on public.conversation_members to authenticated;
grant update (role) on public.conversation_members to authenticated;
grant delete on public.conversation_members to authenticated;

-- Expand the existing private notification inbox for chat messages and mentions.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
check (type in ('friend_request','friend_accepted','post_like','post_comment','chat_message','mention'));

create or replace function private.notify_chat_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_row record;
  mentioned_ids uuid[];
  message_preview text;
begin
  if coalesce(to_jsonb(new)->>'message_type','text')='audio' then
    message_preview := 'Sent you a voice message';
  else
    message_preview := left(new.content,240);
  end if;

  select coalesce(array_agg(distinct p.id),array[]::uuid[])
  into mentioned_ids
  from public.profiles p
  where p.id <> new.sender_id
    and new.content ~* ('(^|[^a-z0-9_])@' || p.username || '([^a-z0-9_]|$)')
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id=new.conversation_id and cm.user_id=p.id
    );

  for member_row in
    select cm.user_id
    from public.conversation_members cm
    where cm.conversation_id=new.conversation_id
      and cm.user_id<>new.sender_id
  loop
    insert into public.notifications(recipient_id,actor_id,type,target_id,preview)
    values(
      member_row.user_id,
      new.sender_id,
      case when member_row.user_id=any(mentioned_ids) then 'mention' else 'chat_message' end,
      new.conversation_id,
      message_preview
    );
  end loop;
  return new;
end;
$$;

revoke all on function private.notify_chat_message() from public,anon,authenticated;
drop trigger if exists notify_chat_message on public.messages;
create trigger notify_chat_message
after insert on public.messages
for each row execute function private.notify_chat_message();

-- Private WebRTC signaling topics are only available to members of that conversation.
drop policy if exists "Conversation members receive call broadcasts" on realtime.messages;
create policy "Conversation members receive call broadcasts"
on realtime.messages for select to authenticated
using (
  realtime.messages.extension='broadcast'
  and split_part(realtime.topic(),':',1)='call'
  and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id=nullif(split_part(realtime.topic(),':',2),'')::uuid
      and cm.user_id=(select auth.uid())
  )
);

drop policy if exists "Conversation members send call broadcasts" on realtime.messages;
create policy "Conversation members send call broadcasts"
on realtime.messages for insert to authenticated
with check (
  realtime.messages.extension='broadcast'
  and split_part(realtime.topic(),':',1)='call'
  and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id=nullif(split_part(realtime.topic(),':',2),'')::uuid
      and cm.user_id=(select auth.uid())
  )
);

-- Ensure the message notification inbox continues to stream live.
do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
     and not exists(
       select 1 from pg_publication_tables
       where pubname='supabase_realtime'
         and schemaname='public'
         and tablename='notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
