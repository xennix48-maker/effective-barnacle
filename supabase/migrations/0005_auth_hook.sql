-- 0005_auth_hook.sql
-- Custom Access Token Hook — injects telegram_id and is_admin claims into the JWT.
-- This enables RLS to read is_admin via auth.jwt() ->> 'is_admin'.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  v_uid uuid;
  v_tg  bigint;
  v_adm boolean;
  v_claims jsonb;
begin
  v_uid := (event ->> 'user_id')::uuid;
  select telegram_id, is_admin into v_tg, v_adm
    from public.users
    where id = v_uid;

  v_claims := coalesce(event -> 'claims', '{}'::jsonb)
              || jsonb_build_object(
                   'telegram_id', v_tg,
                   'is_admin',    coalesce(v_adm, false)
                 );
  event := jsonb_set(event, '{claims}', v_claims);
  return event;
end
$$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

revoke execute on function public.custom_access_token_hook(jsonb)
  from authenticated, anon, public;

-- Activate this hook in the Supabase Dashboard:
--   Authentication → Hooks → Custom Access Token → Enable
--   URI: pg-functions://postgres/public/custom_access_token_hook
-- Or via supabase/config.toml:
--   [auth.hook.custom_access_token]
--   uri = "pg-functions://postgres/public/custom_access_token_hook"
