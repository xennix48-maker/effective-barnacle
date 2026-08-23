-- 0006_fix_security_advisors.sql
--
-- Address Supabase linter findings:
--   * 3 views defined with SECURITY DEFINER -> convert to SECURITY INVOKER
--     so RLS policies on the underlying tables apply for the querying user.
--   * 2 functions (is_admin, custom_access_token_hook) had mutable
--     search_path -> pin to pg_catalog, public.
--
-- SECURITY INVOKER is the safe default: each view executes with the caller's
-- permissions, so user_machines RLS (self-only) correctly filters balances.

DROP VIEW IF EXISTS public.v_level_rate CASCADE;
CREATE VIEW public.v_level_rate
WITH (security_invoker = true) AS
SELECT
  c.level,
  c.name,
  c.price_mmk,
  c.daily_mmk,
  (c.daily_mmk::numeric / 86400.0)::numeric(18, 8) AS rate_per_sec,
  c.sort_order,
  c.active
FROM public.machines_catalog c
WHERE c.active = true;

DROP VIEW IF EXISTS public.v_user_balance CASCADE;
CREATE VIEW public.v_user_balance
WITH (security_invoker = true) AS
SELECT
  um.user_id,
  COALESCE(SUM(r.rate_per_sec * EXTRACT(EPOCH FROM (now() - um.start_time))), 0)::numeric(18, 4)
    AS live_balance
FROM public.user_machines um
JOIN public.v_level_rate r ON r.level = um.level
WHERE um.status = 'active' AND um.start_time IS NOT NULL
GROUP BY um.user_id;

DROP VIEW IF EXISTS public.v_user_balance_snapshot CASCADE;
CREATE VIEW public.v_user_balance_snapshot
WITH (security_invoker = true) AS
SELECT
  um.user_id,
  COALESCE(SUM(r.rate_per_sec * EXTRACT(EPOCH FROM (now() - um.start_time))), 0)::numeric(18, 4)
    AS base_balance,
  COALESCE(SUM(r.rate_per_sec), 0)::numeric(18, 8) AS rate_per_sec_total,
  MIN(um.start_time) AS earliest_start
FROM public.user_machines um
JOIN public.v_level_rate r ON r.level = um.level
WHERE um.status = 'active' AND um.start_time IS NOT NULL
GROUP BY um.user_id;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'is_admin')::boolean,
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  claims jsonb;
  tg_id bigint;
  is_admin_flag boolean;
  uid uuid;
BEGIN
  claims := event->'claims';
  uid := (event->'user_id')::uuid;

  SELECT telegram_id, is_admin INTO tg_id, is_admin_flag
  FROM public.users WHERE id = uid;

  IF tg_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{telegram_id}', to_jsonb(tg_id));
  END IF;
  claims := jsonb_set(claims, '{is_admin}', to_jsonb(COALESCE(is_admin_flag, false)));

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Recreate grants lost when views were dropped.
GRANT SELECT ON public.v_level_rate            TO authenticated, anon;
GRANT SELECT ON public.v_user_balance          TO authenticated;
GRANT SELECT ON public.v_user_balance_snapshot TO authenticated;