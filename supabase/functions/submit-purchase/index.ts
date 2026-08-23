// submit-purchase — user-authenticated.
//
// Body: {
//   level, price_mmk, payment_method, phone, account_name, last6, note,
//   screenshot_url?,
// }
// Effects:
//   - Inserts user_machines (status='pending') + transactions (status='pending')
//   - Posts a Telegram message to the configured admin group with the receipt
//     summary and (if present) the uploaded screenshot.
//   - Returns { machine_id, transaction_id }

import { getAuthContext } from '../_shared/auth.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

const TG_BOT_TOKEN = Deno.env.get('TG_BOT_TOKEN') ?? '';
const TG_ADMIN_CHAT_ID = Deno.env.get('TG_ADMIN_CHAT_ID') ?? '';

async function tgCall(method: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !(data as any).ok) {
    // eslint-disable-next-line no-console
    console.warn(`[submit-purchase] tg ${method} failed`, res.status, data);
  }
  return data;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse('POST required', 405);

  const ctx = await getAuthContext(req);
  if (!ctx) return errorResponse('Unauthorized', 401);

  let body: {
    level?: string;
    price_mmk?: number | string;
    payment_method?: 'wave' | 'kbz';
    phone?: string;
    account_name?: string;
    last6?: string;
    note?: string;
    screenshot_url?: string;
  };
  try { body = await req.json(); } catch { return errorResponse('Invalid JSON'); }

  if (!body.level || !body.price_mmk || !body.payment_method || !body.phone) {
    return errorResponse('level, price_mmk, payment_method, phone are required');
  }
  if (!['wave', 'kbz'].includes(body.payment_method)) {
    return errorResponse('payment_method must be wave or kbz');
  }
  const priceMmk = Number(body.price_mmk);
  if (!Number.isFinite(priceMmk) || priceMmk <= 0) {
    return errorResponse('price_mmk must be a positive number');
  }

  // Validate that the level exists + matches catalog price (prevents client-side spoofing).
  const { data: catalog, error: catErr } = await ctx.supabase
    .from('machines_catalog')
    .select('level,name,price_mmk,active')
    .eq('level', body.level)
    .maybeSingle();
  if (catErr) return errorResponse(`catalog lookup failed: ${catErr.message}`, 500);
  if (!catalog || !catalog.active) return errorResponse('Machine level not available', 400);
  if (Number(catalog.price_mmk) !== priceMmk) {
    return errorResponse('price_mmk does not match catalog', 400);
  }

  // 1. Insert pending user_machine
  const { data: machine, error: mErr } = await ctx.supabase
    .from('user_machines')
    .insert({
      user_id: ctx.userId,
      level: body.level,
      price_paid_mmk: priceMmk,
      status: 'pending',
    })
    .select('id')
    .single();
  if (mErr || !machine) return errorResponse(`insert user_machines: ${mErr?.message}`, 500);

  // 2. Insert pending transaction
  const { data: txn, error: tErr } = await ctx.supabase
    .from('transactions')
    .insert({
      user_id: ctx.userId,
      kind: 'purchase',
      amount_mmk: priceMmk,
      status: 'pending',
      payment_method: body.payment_method,
      phone: body.phone,
      account_name: body.account_name ?? null,
      last6: body.last6 ?? null,
      note: body.note ?? null,
      screenshot_url: body.screenshot_url ?? null,
      related_machine: machine.id,
    })
    .select('id')
    .single();
  if (tErr || !txn) {
    // Roll back the machine so we don't leave orphan rows.
    await ctx.supabase.from('user_machines').delete().eq('id', machine.id);
    return errorResponse(`insert transactions: ${tErr?.message}`, 500);
  }

  // 3. Notify Telegram group (best-effort, never fails the submission).
  if (TG_BOT_TOKEN && TG_ADMIN_CHAT_ID) {
    // Look up buyer profile for the notification
    const { data: profile } = await ctx.supabase
      .from('users')
      .select('telegram_id,first_name,username')
      .eq('id', ctx.userId)
      .maybeSingle();
    const tgId = profile?.telegram_id ?? '?';
    const firstName = profile?.first_name ?? '(no name)';
    const username = profile?.username ? `@${profile.username}` : '';

    const summary =
      `🛒 <b>New purchase submission</b>\n\n` +
      `👤 ${escapeHtml(firstName)} ${escapeHtml(username)}\n` +
      `🆔 tg:${tgId}\n` +
      `⛏️ <b>${escapeHtml(String(catalog.name))}</b> (${escapeHtml(body.level)})\n` +
      `💰 ${priceMmk.toLocaleString()} MMK\n` +
      `💳 ${body.payment_method.toUpperCase()} · ${escapeHtml(body.phone)}\n` +
      (body.last6 ? `🔢 last6: <code>${escapeHtml(body.last6)}</code>\n` : '') +
      (body.account_name ? `👤 Account: ${escapeHtml(body.account_name)}\n` : '') +
      (body.note ? `📝 Note: ${escapeHtml(body.note)}\n` : '') +
      `\n🆔 txn: <code>${txn.id}</code>\n` +
      `🆔 machine: <code>${machine.id}</code>`;

    const adminUrl =
      `${Deno.env.get('PUBLIC_ADMIN_URL') ?? 'https://btcmine-machine.vercel.app'}` +
      `#/admin/purchases`;

    try {
      if (body.screenshot_url) {
        await tgCall('sendPhoto', {
          chat_id: TG_ADMIN_CHAT_ID,
          photo: body.screenshot_url,
          caption: summary + `\n\n🔗 Admin: ${adminUrl}`,
          parse_mode: 'HTML',
        });
      } else {
        await tgCall('sendMessage', {
          chat_id: TG_ADMIN_CHAT_ID,
          text: summary + `\n\n🔗 Admin: ${adminUrl}`,
          parse_mode: 'HTML',
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[submit-purchase] tg notify failed', e);
    }
  }

  return jsonResponse({ ok: true, machine_id: machine.id, transaction_id: txn.id });
});