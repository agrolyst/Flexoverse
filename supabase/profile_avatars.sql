-- Public profile photos. Public downloads are intentional; object writes stay
-- scoped to the authenticated user's own UUID folder.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do nothing;

drop policy if exists "Users can read their own avatar objects" on storage.objects;
create policy "Users can read their own avatar objects" on storage.objects for select to authenticated
using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "Users can upload avatars to their own folder" on storage.objects;
create policy "Users can upload avatars to their own folder" on storage.objects for insert to authenticated
with check(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "Users can delete avatars from their own folder" on storage.objects;
create policy "Users can delete avatars from their own folder" on storage.objects for delete to authenticated
using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

