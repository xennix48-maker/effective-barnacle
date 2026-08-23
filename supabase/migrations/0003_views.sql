-- 0003_views.sql
-- Computed-on-read views for live income accrual.

-- Rate per second per level (daily_mmk / 86400).
create or replace view public.v_level_rate as
  select
    level,
    (daily_mmk / 86400.0)::numeric(18,8) as rate_per_sec
  from public.machines_catalog
  where active;

-- Live balance per user: sum of (rate_per_sec × seconds since start_time) over active machines.
create or replace view public.v_user_balance as
  select
    um.user_id,
    coalesce(sum(v.rate_per_sec * extract(epoch from (now() - um.start_time))), 0)::numeric(18,4)
      as live_balance
  from public.user_machines um
  join public.v_level_rate v on v.level = um.level
  where um.status = 'active' and um.start_time is not null
  group by um.user_id;

-- Snapshot for client interpolation: base balance + aggregate rate + earliest start.
create or replace view public.v_user_balance_snapshot as
  select
    um.user_id,
    coalesce(sum(v.rate_per_sec * extract(epoch from (now() - um.start_time))), 0)::numeric(18,4)
      as base_balance,
    coalesce(sum(v.rate_per_sec), 0)::numeric(18,8)
      as rate_per_sec_total,
    max(um.start_time) as earliest_start
  from public.user_machines um
  join public.v_level_rate v on v.level = um.level
  where um.status = 'active' and um.start_time is not null
  group by um.user_id;

-- Grant view access to authenticated role.
grant select on public.v_level_rate          to authenticated;
grant select on public.v_user_balance        to authenticated;
grant select on public.v_user_balance_snapshot to authenticated;
