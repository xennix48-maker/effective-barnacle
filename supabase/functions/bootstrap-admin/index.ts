// bootstrap-admin edge function — one-shot.
//
// Creates an auth.users row with email + password (so /admin.html can use
// supabase.auth.signInWithPassword instead of Telegram WebApp HMAC) and
// upserts public.users with is_admin=true.
//
// Service-role-gated — never expose to anon. Call via:
//   curl -X POST $SUPABASE_URL/functions/v1/bootstrap-admin \
//     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
//     -H "Content-Type: application/json" \
//     -d '{"email":"...","password":"...","telegram_id":...}'
//
// Idempotent: re-running on an existing email resolves the user_id and
// re-upserts the public.users row.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCors(req);
  if (req.method !== 'POST') return errorResponse('POST only', 405);

  const auth = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`;
  if (!expected || expected === 'Bearer ' || auth !== expected) {
    return errorResponse('Forbidden — service role required', 403);
  }

  let body: { email?: string; password?: string; telegram_id?: number };
  try { body = await req.json(); } catch { return errorResponse('Invalid JSON'); }
  if (!body.email || !body.password || !body.telegram_id) {
    return errorResponse('email, password, telegram_id required', 400);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SERVICE_ROLE) return errorResponse('Supabase env not configured', 500);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Create or look up auth.users row.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { telegram_id: body.telegram_id, source: 'bootstrap-admin' },
  });

  let userId: string | null = created?.user?.id ?? null;
  if (!userId && createErr && /already registered/i.test(createErr.message ?? '')) {
    const { data: list, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) return errorResponse(`listUsers: ${listErr.message}`, 500);
    userId = list.users.find((u: any) => u.email === body.email)?.id ?? null;
  } else if (createErr) {
    return errorResponse(`createUser: ${createErr.message}`, 500);
  }
  if (!userId) return errorResponse('Could not resolve user_id', 500);

  // 2. Upsert public.users row with is_admin=true.
  const { error: upsertErr } = await admin
    .from('users')
    .upsert(
      { id: userId, telegram_id: body.telegram_id, is_admin: true },
      { onConflict: 'id' }
    );
  if (upsertErr) return errorResponse(`users upsert: ${upsertErr.message}`, 500);

  return jsonResponse({ ok: true, user_id: userId, email: body.email, is_admin: true });
});
