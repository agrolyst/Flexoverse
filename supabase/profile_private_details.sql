-- Store optional address details separately from public profile information.
-- Only the signed-in owner may read or edit their own row.

create table if not exists public.private_profile_details (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  address text not null default '' check (char_length(address) <= 300),
  updated_at timestamptz not null default now()
);

alter table public.private_profile_details enable row level security;
revoke all on table public.private_profile_details from public,anon,authenticated;
grant select,insert,update on table public.private_profile_details to authenticated;

create policy "Users read their private profile details" on public.private_profile_details
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users create their private profile details" on public.private_profile_details
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users update their private profile details" on public.private_profile_details
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
