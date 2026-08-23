-- 0001_init_schema.sql
-- Tables, enums, indexes for Btcak.

create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type machine_status as enum ('pending','active','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type txn_kind as enum ('purchase','drop','referral_bonus');
exception when duplicate_object then null; end $$;

do $$ begin
  create type txn_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pay_method as enum ('wave','kbz');
exception when duplicate_object then null; end $$;

-- users (profile mirror, 1:1 with auth.users)
create table if not exists public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  telegram_id     bigint unique not null,
  first_name      text,
  username        text,
  photo_url       text,
  is_admin        boolean not null default false,
  referrer_id     uuid references public.users(id),
  balance_cached  numeric(14,2) not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists users_tg_idx on public.users(telegram_id);

-- machines_catalog (server-controlled pricing)
create table if not exists public.machines_catalog (
  level       text primary key,
  name        text not null,
  price_mmk   numeric(12,2) not null check (price_mmk > 0),
  daily_mmk   numeric(12,2) not null check (daily_mmk > 0),
  sort_order  int not null default 0,
  active      boolean not null default true
);

-- user_machines (owned machines)
create table if not exists public.user_machines (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  level           text not null references public.machines_catalog(level),
  price_paid_mmk  numeric(12,2) not null,
  status          machine_status not null default 'pending',
  requested_at    timestamptz not null default now(),
  start_time      timestamptz,
  reject_reason   text
);
create index if not exists um_user_idx on public.user_machines(user_id);
create index if not exists um_active_idx on public.user_machines(user_id, status) where status='active';

-- transactions (every purchase / drop / bonus event)
create table if not exists public.transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  kind            txn_kind not null,
  amount_mmk      numeric(12,2) not null,
  status          txn_status not null default 'pending',
  payment_method  pay_method,
  phone           text,
  account_name    text,
  last6           text,
  note            text,
  related_machine uuid references public.user_machines(id),
  admin_id        uuid references public.users(id),
  reject_reason   text,
  created_at      timestamptz not null default now(),
  decided_at      timestamptz
);
create index if not exists tx_user_idx on public.transactions(user_id);
create index if not exists tx_status_idx on public.transactions(status, kind);

-- referrals (one row per referred user)
create table if not exists public.referrals (
  id           uuid primary key default gen_random_uuid(),
  referrer_id  uuid not null references public.users(id) on delete cascade,
  referred_id  uuid not null references public.users(id) on delete cascade,
  bonus_mmk    numeric(12,2) not null default 5000,
  paid         boolean not null default false,
  paid_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique (referred_id)
);
create index if not exists ref_referrer_idx on public.referrals(referrer_id);

-- settings (app-wide toggles)
create table if not exists public.settings (
  key   text primary key,
  value jsonb not null
);

-- trigger: when a user row is created, ensure auth.users row also exists
-- (tg-auth edge function handles this via admin API; no DB trigger needed for v1.)
