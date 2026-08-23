-- 0002_rls.sql
-- Row-Level Security policies and helper functions.

-- Helper: is the current JWT marked admin? Reads claim only — no table access, no recursion.
create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select coalesce((auth.jwt() ->> 'is_admin')::boolean, false)
$$;

-- users
alter table public.users enable row level security;

drop policy if exists "users self read" on public.users;
create policy "users self read" on public.users
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "users self update" on public.users;
create policy "users self update" on public.users
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and is_admin = (select is_admin from public.users where id = auth.uid())
  );

drop policy if exists "users self insert" on public.users;
create policy "users self insert" on public.users
  for insert with check (id = auth.uid());

-- machines_catalog
alter table public.machines_catalog enable row level security;

drop policy if exists "catalog read" on public.machines_catalog;
create policy "catalog read" on public.machines_catalog
  for select using (auth.role() = 'authenticated');

drop policy if exists "catalog admin write" on public.machines_catalog;
create policy "catalog admin write" on public.machines_catalog
  for all using (public.is_admin()) with check (public.is_admin());

-- user_machines
alter table public.user_machines enable row level security;

drop policy if exists "user_machines read" on public.user_machines;
create policy "user_machines read" on public.user_machines
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_machines self insert pending" on public.user_machines;
create policy "user_machines self insert pending" on public.user_machines
  for insert with check (user_id = auth.uid() and status = 'pending');

-- status/start_time writes only via service role (edge functions).

-- transactions
alter table public.transactions enable row level security;

drop policy if exists "transactions read" on public.transactions;
create policy "transactions read" on public.transactions
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "transactions self insert" on public.transactions;
create policy "transactions self insert" on public.transactions
  for insert with check (
    user_id = auth.uid()
    and status = 'pending'
    and kind in ('purchase','drop')
  );

-- status/admin_id/reject_reason/decided_at writes only via service role.

-- referrals
alter table public.referrals enable row level security;

drop policy if exists "referrals read" on public.referrals;
create policy "referrals read" on public.referrals
  for select using (referrer_id = auth.uid() or public.is_admin());

-- referrals writes only via service role.

-- settings
alter table public.settings enable row level security;

drop policy if exists "settings read" on public.settings;
create policy "settings read" on public.settings
  for select using (auth.role() = 'authenticated');

drop policy if exists "settings admin write" on public.settings;
create policy "settings admin write" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());
