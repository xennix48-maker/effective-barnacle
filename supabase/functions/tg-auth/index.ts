// tg-auth edge function.
//
// Validates Telegram WebApp initData via HMAC-SHA256 with the bot token,
// upserts the public.users row keyed on telegram_id, parses ?startapp=ref_<id>
// for referral attribution, then mints a Supabase session using the admin API
// and returns { access_token, refresh_token, expires_in, user }.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

const BOT_TOKEN = Deno.env.get('BOT_TOKEN') ?? '';
const ADMIN_TG_IDS = (Deno.env.get('ADMIN_TG_IDS') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

async function hmacSha256(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function parseInitData(initData: string): {
  pairs: Array<[string, string]>;
  hash: string;
  authDate: number | null;
  user: any | null;
  startParam: string | null;
} {
  const sp = new URLSearchParams(initData);
  const pairs: Array<[string, string]> = [];
  for (const [k, v] of sp.entries()) pairs.push([k, v]);
  pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const hash = sp.get('hash') ?? '';
  const authDateStr = sp.get('auth_date');
  const authDate = authDateStr ? Number(authDateStr) : null;
  const userStr = sp.get('user');
  let user: any = null;
  if (userStr) { try { user = JSON.parse(userStr); } catch { user = null; } }
  const startParam = sp.get('start_param');
  return { pairs: pairs.filter(([k]) => k !== 'hash'), hash, authDate, user, startParam };
}

function buildDataCheckString(pairs: Array<[string, string]>): string {
  return pairs.map(([k, v]) => `${k}=${v}`).join('\n');
}

async function validateInitData(
  initData: string
): Promise<{ ok: boolean; reason?: string; user?: any; startParam?: string | null }> {
  if (!BOT_TOKEN) return { ok: false, reason: 'BOT_TOKEN not configured' };
  const { pairs, hash, authDate, user, startParam } = parseInitData(initData);
  if (!hash) return { ok: false, reason: 'missing hash' };
  const secretKey = await hmacSha256('WebAppData', BOT_TOKEN);
  const dataCheckString = buildDataCheckString(pairs);
  const expected = await hmacSha256(secretKey, dataCheckString);
  if (!constantTimeEqual(expected, hash)) return { ok: false, reason: 'invalid hash' };
  if (authDate && Date.now() / 1000 - authDate > 3600) {
    return { ok: false, reason: 'auth_date too old' };
  }
  return { ok: true, user, startParam };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse('POST required', 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return errorResponse('Supabase env not configured', 500);
  }

  let body: { initData?: string; startParam?: string };
  try { body = await req.json(); } catch { return errorResponse('Invalid JSON body'); }
  if (!body.initData) return errorResponse('initData is required');

  const validation = await validateInitData(body.initData);
  if (!validation.ok || !validation.user) {
    return errorResponse(`initData validation failed: ${validation.reason}`, 401);
  }
  const tgUser = validation.user;
  const telegramId = Number(tgUser.id);
  if (!Number.isFinite(telegramId)) return errorResponse('telegram id missing', 400);

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const syntheticEmail = `tg_${telegramId}@btcak.local`;

  // 1. Ensure auth.users row exists.
  let authUserId: string | null = null;
  const { data: createdUser, error: createErr } = await adminClient.auth.admin.createUser({
    email: syntheticEmail,
    email_confirm: true,
    user_metadata: {
      telegram_id: telegramId,
      first_name: tgUser.first_name ?? null,
      username: tgUser.username ?? null,
      photo_url: tgUser.photo_url ?? null,
    },
  });
  if (createdUser?.user?.id) {
    authUserId = createdUser.user.id;
  } else if (createErr && /already registered/i.test(createErr.message ?? '')) {
    // Already exists — look it up.
    const { data: list, error: listErr } = await adminClient.auth.admin.listUsers();
    if (listErr) return errorResponse(`auth listUsers failed: ${listErr.message}`, 500);
    const existing = list.users.find((u: any) => u.email === syntheticEmail);
    if (existing) authUserId = existing.id;
  } else if (createErr) {
    return errorResponse(`createUser failed: ${createErr.message}`, 500);
  }
  if (!authUserId) return errorResponse('Failed to provision auth user', 500);

  // 2. Upsert public.users.
  const isAdmin = ADMIN_TG_IDS.includes(String(telegramId));
  const { error: upsertErr } = await adminClient
    .from('users')
    .upsert(
      {
        id: authUserId,
        telegram_id: telegramId,
        first_name: tgUser.first_name ?? null,
        username: tgUser.username ?? null,
        photo_url: tgUser.photo_url ?? null,
        is_admin: isAdmin,
      },
      { onConflict: 'id' }
    );
  if (upsertErr) return errorResponse(`users upsert failed: ${upsertErr.message}`, 500);

  // 3. Referral attribution if startParam matches ref_<id>.
  const startParam: string | null = validation.startParam ?? body.startParam ?? null;
  if (startParam && /^ref_(\d+)$/.test(startParam)) {
    const refTgId = Number(startParam.match(/^ref_(\d+)$/)![1]);
    if (refTgId !== telegramId) {
      const { data: referrer } = await adminClient
        .from('users')
        .select('id')
        .eq('telegram_id', refTgId)
        .maybeSingle();
      if (referrer) {
        await adminClient
          .from('users')
          .update({ referrer_id: referrer.id })
          .eq('id', authUserId)
          .is('referrer_id', null);
        await adminClient
          .from('referrals')
          .upsert(
            { referrer_id: referrer.id, referred_id: authUserId },
            { onConflict: 'referred_id', ignoreDuplicates: true }
          );
      }
    }
  }

  // 4. Mint a session directly via admin API.
  const { data: session, error: sessErr } = await adminClient.auth.admin.createSession({
    user_id: authUserId,
  });
  if (sessErr || !session) {
    return errorResponse(`session mint failed: ${sessErr?.message ?? 'unknown'}`, 500);
  }

  return jsonResponse({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in ?? 3600,
    user: { id: authUserId, telegram_id: telegramId, is_admin: isAdmin },
  });
});
