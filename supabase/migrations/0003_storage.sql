-- 0003_storage.sql
-- Private storage buckets for meal and progress photos (§4.4).
-- Objects are namespaced by user id as the first path segment:
--   meal-photos/{user_id}/{food_log_id}.jpg
--   progress-photos/{user_id}/{yyyy-mm-dd}.jpg
-- RLS restricts each object to its owning user.

insert into storage.buckets (id, name, public)
values
  ('meal-photos',     'meal-photos',     false),
  ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

create policy "meal-photos - own objects"
  on storage.objects for all
  using      (bucket_id = 'meal-photos'     and auth.uid() = (storage.foldername(name))[1]::uuid)
  with check (bucket_id = 'meal-photos'     and auth.uid() = (storage.foldername(name))[1]::uuid);

create policy "progress-photos - own objects"
  on storage.objects for all
  using      (bucket_id = 'progress-photos' and auth.uid() = (storage.foldername(name))[1]::uuid)
  with check (bucket_id = 'progress-photos' and auth.uid() = (storage.foldername(name))[1]::uuid);
