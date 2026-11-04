-- Flexoverse membership and verification
-- Applied to the connected project as migration flexoverse_membership_verification.

alter table public.profiles
  add column if not exists membership_plan text not null default 'standard',
  add column if not exists membership_status text not null default 'active',
  add column if not exists is_verified boolean not null default false,
  add column if not exists verified_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_membership_plan_check,
  add constraint profiles_membership_plan_check check (membership_plan in ('standard','plus')),
  drop constraint if exists profiles_membership_status_check,
  add constraint profiles_membership_status_check check (membership_status in ('active','paused','expired'));

comment on column public.profiles.membership_plan is 'Admin-managed membership plan. New accounts start on standard; paid upgrades require a verified payment integration.';
comment on column public.profiles.membership_status is 'Admin-managed membership status; never editable by the account owner.';
comment on column public.profiles.is_verified is 'True only after Flexoverse staff confirms account identity and authenticity.';
comment on column public.profiles.verified_at is 'Timestamp when Flexoverse staff approved profile verification.';

revoke insert, update on table public.profiles from anon, authenticated;
revoke insert (id,username,full_name,bio,avatar_url,is_public,search_index_enabled,created_at,updated_at,membership_plan,membership_status,is_verified,verified_at)
  on public.profiles from anon, authenticated;
revoke update (id,username,full_name,bio,avatar_url,is_public,search_index_enabled,created_at,updated_at,membership_plan,membership_status,is_verified,verified_at)
  on public.profiles from anon, authenticated;
grant update (username,full_name,bio,avatar_url,is_public,search_index_enabled) on public.profiles to authenticated;

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  public_links text not null default '' check (char_length(public_links) <= 1000),
  reason text not null check (char_length(trim(reason)) between 20 and 800),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists verification_requests_user_idx on public.verification_requests(user_id,requested_at desc);
create unique index if not exists verification_requests_one_pending_per_user on public.verification_requests(user_id) where status='pending';

alter table public.verification_requests enable row level security;
revoke all on table public.verification_requests from anon, authenticated;
grant select on table public.verification_requests to authenticated;
grant insert (user_id,full_name,public_links,reason) on public.verification_requests to authenticated;

drop policy if exists "Users read their own verification requests" on public.verification_requests;
create policy "Users read their own verification requests" on public.verification_requests
  for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "Users submit their own verification requests" on public.verification_requests;
create policy "Users submit their own verification requests" on public.verification_requests
  for insert to authenticated with check (user_id=(select auth.uid()) and status='pending');

create or replace function public.get_my_verification_request()
returns table(full_name text,public_links text,reason text,status text,requested_at timestamptz,reviewed_at timestamptz)
language sql stable security invoker set search_path=''
as $$
  select vr.full_name,vr.public_links,vr.reason,vr.status,vr.requested_at,vr.reviewed_at
  from public.verification_requests vr
  where vr.user_id=(select auth.uid())
  order by vr.requested_at desc
  limit 1;
$$;
revoke all on function public.get_my_verification_request() from public,anon,authenticated;
grant execute on function public.get_my_verification_request() to authenticated;

create or replace function public.submit_verification_request(p_full_name text,p_public_links text,p_reason text)
returns uuid language plpgsql security invoker set search_path=''
as $$
declare caller_id uuid := (select auth.uid()); request_id uuid;
begin
  if caller_id is null then raise exception 'Sign in to request verification' using errcode='42501'; end if;
  if char_length(trim(coalesce(p_full_name,''))) not between 2 and 100 then raise exception 'Enter your full name (2–100 characters)' using errcode='22023'; end if;
  if char_length(coalesce(p_public_links,''))>1000 then raise exception 'Links must be 1,000 characters or fewer' using errcode='22023'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 20 and 800 then raise exception 'Tell us why you are requesting verification (20–800 characters)' using errcode='22023'; end if;
  if exists(select 1 from public.profiles p where p.id=caller_id and p.is_verified) then raise exception 'This profile is already verified' using errcode='22023'; end if;
  if exists(select 1 from public.verification_requests vr where vr.user_id=caller_id and vr.status='pending') then raise exception 'You already have a verification request under review' using errcode='23505'; end if;
  insert into public.verification_requests(user_id,full_name,public_links,reason)
  values(caller_id,trim(p_full_name),trim(coalesce(p_public_links,'')),trim(p_reason))
  returning id into request_id;
  return request_id;
end;
$$;
revoke all on function public.submit_verification_request(text,text,text) from public,anon,authenticated;
grant execute on function public.submit_verification_request(text,text,text) to authenticated;

comment on table public.verification_requests is 'Private verification applications. Users may submit and read only their own request; trusted staff review status and set profiles.is_verified.';
