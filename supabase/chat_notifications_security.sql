-- Tighten the RPC helpers after the first chat migration.
alter function public.list_my_conversations() security invoker;
alter function public.start_direct_conversation(uuid) security invoker;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles'
      and policyname='Accepted friends can read profiles'
  ) then
    create policy "Accepted friends can read profiles" on public.profiles
      for select to authenticated
      using (exists(
        select 1 from public.friend_requests f
        where f.status='accepted'
          and ((f.from_user_id=profiles.id and f.to_user_id=(select auth.uid()))
            or (f.to_user_id=profiles.id and f.from_user_id=(select auth.uid())))
      ));
  end if;
end;
$$;

create index if not exists notifications_actor_idx
  on public.notifications(actor_id,created_at desc);
