import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  approvePurchase,
  fetchPendingPurchases,
  type Transaction,
} from '../../lib/api';
import { pushToast } from '../../components/Toast';
import { RejectModal } from '../../components/RejectModal';
import { formatDate, formatMMKShort } from '../../lib/format';
import { hapticImpact } from '../../lib/telegram';

type Row = Transaction & {
  user_first_name?: string;
  user_username?: string;
  user_telegram_id?: number;
  level?: string;
};

export function Purchases() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<Transaction | null>(null);

  async function load() {
    setLoading(true);
    try {
      const txns = await fetchPendingPurchases();
      const userIds = Array.from(new Set(txns.map((t) => t.user_id).filter(Boolean)));
      const userMap = new Map<string, { first_name?: string; username?: string; telegram_id?: number }>();
      if (userIds.length) {
        const { data: users } = await supabase
          .from('users')
          .select('id,first_name,username,telegram_id')
          .in('id', userIds as string[]);
        for (const u of users ?? []) {
          userMap.set(u.id as string, u as any);
        }
      }
      const machineIds = txns.map((t) => t.related_machine).filter(Boolean) as string[];
      const machineMap = new Map<string, string>();
      if (machineIds.length) {
        const { data: machines } = await supabase
          .from('user_machines')
          .select('id,level')
          .in('id', machineIds);
        for (const m of machines ?? []) {
          machineMap.set(m.id as string, m.level as string);
        }
      }
      setRows(
        txns.map((t) => ({
          ...t,
          user_first_name: t.user_id ? userMap.get(t.user_id)?.first_name : undefined,
          user_username: t.user_id ? userMap.get(t.user_id)?.username : undefined,
          user_telegram_id: t.user_id ? userMap.get(t.user_id)?.telegram_id : undefined,
          level: t.related_machine ? machineMap.get(t.related_machine) : undefined,
        }))
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function onApprove(id: string) {
    hapticImpact('light');
    setBusyId(id);
    try {
      await approvePurchase(id, true);
      pushToast('Approve လုပ်ပြီးပါပြီ', 'success');
      await load();
    } catch (e: any) {
      pushToast(`မအောင်မြင်ပါ: ${e?.message ?? 'unknown'}`, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function onConfirmReject(reason: string) {
    if (!rejectFor) return;
    const id = rejectFor.id;
    setBusyId(id);
    try {
      await approvePurchase(id, false, reason);
      pushToast('Reject လုပ်ပြီးပါပြီ', 'info');
      setRejectFor(null);
      await load();
    } catch (e: any) {
      pushToast(`မအောင်မြင်ပါ: ${e?.message ?? 'unknown'}`, 'error');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="empty">
        <div className="spinner" style={{ margin: '0 auto 8px' }} />
        <p className="text-dim">Loading purchases...</p>
      </div>
    );
  }

  return (
    <section className="stack">
      <div className="row row--between">
        <h3 className="home-section__title">🛒 Pending Purchases</h3>
        <span className="badge badge--accent">{rows.length} ခု</span>
      </div>

      {rows.length === 0 ? (
        <div className="admin-empty">
          ✓ စောင့်ဆိုင်းနေသော purchase မရှိပါ
        </div>
      ) : null}

      <div className="admin-list">
        {rows.map((r) => (
          <article key={r.id} className="admin-row">
            <header className="admin-row__head">
              <div>
                <div className="admin-row__title">
                  {r.user_first_name ?? '(no name)'}
                  {r.user_username ? (
                    <span className="text-dim text-sm" style={{ marginLeft: 6 }}>
                      @{r.user_username}
                    </span>
                  ) : null}
                </div>
                <div className="text-dim text-sm">
                  tg:{r.user_telegram_id ?? '?'} · {formatDate(r.created_at)}
                </div>
              </div>
              <span className="badge badge--amber">⏳ Pending</span>
            </header>

            <div className="admin-detail-row">
              <span className="admin-detail-row__label">Machine</span>
              <span className="admin-detail-row__value text-accent">{r.level ?? '?'}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-row__label">ပမာဏ</span>
              <span className="admin-detail-row__value">
                {formatMMKShort(Number(r.amount_mmk))} MMK
              </span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-row__label">ငွေပေးချေမှု</span>
              <span className="admin-detail-row__value">
                <span className="badge badge--blue">{r.payment_method ?? '—'}</span>
              </span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-row__label">ဖုန်း</span>
              <span className="admin-detail-row__value text-mono">{r.phone ?? '—'}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-row__label">Last 6</span>
              <span className="admin-detail-row__value text-mono">{r.last6 ?? '—'}</span>
            </div>
            {r.note ? (
              <div className="admin-detail-row">
                <span className="admin-detail-row__label">Note</span>
                <span className="admin-detail-row__value" style={{ maxWidth: '60%', textAlign: 'right' }}>
                  {r.note}
                </span>
              </div>
            ) : null}

            <div className="admin-row__actions">
              <button
                className="btn btn--success"
                disabled={busyId === r.id}
                onClick={() => onApprove(r.id)}
              >
                ✓ Approve
              </button>
              <button
                className="btn btn--danger"
                disabled={busyId === r.id}
                onClick={() => setRejectFor(r)}
              >
                ✕ Reject
              </button>
            </div>
          </article>
        ))}
      </div>

      <RejectModal
        open={!!rejectFor}
        onCancel={() => setRejectFor(null)}
        onConfirm={onConfirmReject}
        busy={!!busyId}
      />
    </section>
  );
}