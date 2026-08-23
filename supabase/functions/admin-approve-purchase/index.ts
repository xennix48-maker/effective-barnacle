// admin-approve-purchase — admin-only.
//
// Body: { transaction_id: uuid, approve: bool, reason?: string }
// Effects:
//  - Updates transactions row (status, admin_id, decided_at, reject_reason)
//  - On approve: sets user_machines.status='active', start_time=now()
//  - On first active machine for a referred user, marks referral paid +
//    inserts an approved referral_bonus transaction for the referrer.

import { getAuthContext } from '../_shared/auth.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse('POST required', 405);

  const ctx = await getAuthContext(req);
  if (!ctx) return errorResponse('Unauthorized', 401);
  if (!ctx.isAdmin) return errorResponse('Admin only', 403);

  let body: { transaction_id?: string; approve?: boolean; reason?: string };
  try { body = await req.json(); } catch { return errorResponse('Invalid JSON'); }
  if (!body.transaction_id || typeof body.approve !== 'boolean') {
    return errorResponse('transaction_id and approve are required');
  }

  // Load transaction
  const { data: txn, error: txnErr } = await ctx.supabase
    .from('transactions')
    .select('id,user_id,kind,status,related_machine')
    .eq('id', body.transaction_id)
    .maybeSingle();
  if (txnErr) return errorResponse(`load txn: ${txnErr.message}`, 500);
  if (!txn) return errorResponse('Transaction not found', 404);
  if (txn.kind !== 'purchase') return errorResponse('Not a purchase transaction', 400);
  if (txn.status !== 'pending') return errorResponse(`Transaction already ${txn.status}`, 409);
  if (!txn.related_machine) return errorResponse('Missing related_machine', 400);

  // Update transaction
  const patch: Record<string, unknown> = {
    status: body.approve ? 'approved' : 'rejected',
    admin_id: ctx.userId,
    decided_at: new Date().toISOString(),
  };
  if (!body.approve) patch.reject_reason = body.reason ?? 'No reason provided';
  const { error: upErr } = await ctx.supabase
    .from('transactions')
    .update(patch)
    .eq('id', body.transaction_id);
  if (upErr) return errorResponse(`update txn: ${upErr.message}`, 500);

  // Update user_machines
  const mPatch: Record<string, unknown> = body.approve
    ? { status: 'active', start_time: new Date().toISOString(), reject_reason: null }
    : { status: 'rejected', reject_reason: body.reason ?? 'No reason provided' };
  const { error: mErr } = await ctx.supabase
    .from('user_machines')
    .update(mPatch)
    .eq('id', txn.related_machine);
  if (mErr) return errorResponse(`update machine: ${mErr.message}`, 500);

  // Referral bonus: if approved AND no prior active machine for this referred user
  // AND a referrals row exists with paid=false → pay out to referrer.
  if (body.approve) {
    const { data: priorActive } = await ctx.supabase
      .from('user_machines')
      .select('id')
      .eq('user_id', txn.user_id)
      .eq('status', 'active')
      .neq('id', txn.related_machine)
      .limit(1);
    const isFirstActive = !priorActive || priorActive.length === 0;

    if (isFirstActive) {
      const { data: ref } = await ctx.supabase
        .from('referrals')
        .select('id,referrer_id,paid,bonus_mmk')
        .eq('referred_id', txn.user_id)
        .maybeSingle();

      if (ref && !ref.paid) {
        const { error: payRefErr } = await ctx.supabase
          .from('referrals')
          .update({ paid: true, paid_at: new Date().toISOString() })
          .eq('id', ref.id);
        if (payRefErr) {
          // eslint-disable-next-line no-console
          console.warn('referral pay update warn:', payRefErr.message);
        } else {
          // Insert referral_bonus transaction for the referrer
          await ctx.supabase.from('transactions').insert({
            user_id: ref.referrer_id,
            kind: 'referral_bonus',
            amount_mmk: ref.bonus_mmk ?? 5000,
            status: 'approved',
            admin_id: ctx.userId,
            decided_at: new Date().toISOString(),
            note: `Referral bonus for ${txn.user_id}`,
          });
        }
      }
    }
  }

  return jsonResponse({ ok: true });
});
