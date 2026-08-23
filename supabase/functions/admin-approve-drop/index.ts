// admin-approve-drop — admin-only.
//
// Body: { transaction_id: uuid, approve: bool, reason?: string }
// Validates the drop against the live balance at decision time (server-authoritative).
// Balance is computed-on-read so no balance state to mutate.

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
    .select('id,user_id,kind,status,amount_mmk')
    .eq('id', body.transaction_id)
    .maybeSingle();
  if (txnErr) return errorResponse(`load txn: ${txnErr.message}`, 500);
  if (!txn) return errorResponse('Transaction not found', 404);
  if (txn.kind !== 'drop') return errorResponse('Not a drop transaction', 400);
  if (txn.status !== 'pending') return errorResponse(`Transaction already ${txn.status}`, 409);

  if (body.approve) {
    // Live balance check at decision time
    const { data: snap, error: sErr } = await ctx.supabase
      .from('v_user_balance')
      .select('live_balance')
      .eq('user_id', txn.user_id)
      .maybeSingle();
    if (sErr) return errorResponse(`balance check: ${sErr.message}`, 500);
    const live = Number(snap?.live_balance ?? 0);
    if (Number(txn.amount_mmk) > live) {
      return errorResponse(
        `Insufficient balance: requested ${txn.amount_mmk}, live ${live}`,
        400
      );
    }
  }

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

  return jsonResponse({ ok: true });
});
