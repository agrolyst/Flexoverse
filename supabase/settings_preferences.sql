-- User-owned notification display preferences. Activity generation and the
-- existing profile/post visibility policies are intentionally unchanged.

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  in_app_enabled boolean not null default true,
  friend_requests boolean not null default true,
  post_likes boolean not null default true,
  post_comments boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
revoke all on table public.notification_preferences from public,anon,authenticated;
grant select,insert,update on table public.notification_preferences to authenticated;

create policy "Users read their notification preferences" on public.notification_preferences
  for select to authenticated using(user_id=(select auth.uid()));
create policy "Users create their notification preferences" on public.notification_preferences
  for insert to authenticated with check(user_id=(select auth.uid()));
create policy "Users update their notification preferences" on public.notification_preferences
  for update to authenticated
  using(user_id=(select auth.uid()))
  with check(user_id=(select auth.uid()));
