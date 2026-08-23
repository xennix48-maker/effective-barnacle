-- 0007_receipt_uploads.sql
-- Add screenshot upload support for purchase submissions.

alter table public.transactions
  add column if not exists screenshot_url text;

-- Receipts storage bucket: anyone authenticated can upload to their own
-- user-prefixed path; everyone authenticated can read.
insert into storage.buckets (id, name, public)
  values ('receipts', 'receipts', true)
  on conflict (id) do nothing;

-- Allow authenticated users to upload receipts (scoped to their own user_id prefix).
drop policy if exists "receipts upload" on storage.objects;
create policy "receipts upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update their own uploads.
drop policy if exists "receipts update" on storage.objects;
create policy "receipts update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read for the receipts bucket (URLs are used in admin UI + Telegram).
drop policy if exists "receipts public read" on storage.objects;
create policy "receipts public read" on storage.objects
  for select using (bucket_id = 'receipts');