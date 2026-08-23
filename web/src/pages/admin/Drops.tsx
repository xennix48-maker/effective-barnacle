import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { approveDrop, fetchPendingDrops, type Transaction } from '../../lib/api';
import { pushToast } from '../../components/Toast';
import { formatDate, formatMMK, formatMMKShort } from '../../lib/format';

type Row = Transaction & {
  user_first_name?: string;
  user_telegram_id?: number;
  live_balance?: number;
};

export function Drops() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const txns = await fetchPendingDrops();
      const userIds = Array.from(new Set(txns.map((t) => t.user_id).filter(Boolean)));
      const userMap = new Map<string, any>();
      if (userIds.length) {
        const { data: users } = await supabase
          .from('users')
          .select('id,first_name,telegram_id')
          .in('id', userIds as string[]);
        for (const u of users ?? []) userMap.set(u.id as string, u);
      }
      const balanceMap = new Map<string, number>();
      if (userIds.length) {
        const { data: snap } = await supabase
          .from('v_user_balance_snapshot')
          .select('user_id,base_balance,rate_per_sec_total')
          .in('user_id', userIds as string[]);
        for (const s of snap ?? []) {
          balanceMap.set(s.user_id as string, Number(s.base_balance));
        }
      }
      setRows(
        txns.map((t) => ({
          ...t,
          user_first_name: t.user_id ? userMap.get(t.user_id)?.first_name : undefined,
          user_telegram_id: t.user_id ? userMap.get(t.user_id)?.telegram_id : undefined,
          live_balance: t.user_id ? balanceMap.get(t.user_id) : undefined,
        }))
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function onApprove(id: string) {
    setBusyId(id);
    try {
      await approveDrop(id, true);
      pushToast('Approve လုပ်ပြီးပါပြီ', 'success');
      await load();
    } catch (e: any) {
      pushToast(`မအောင်မြင်ပါ: ${e?.message ?? 'unknown'}`, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(id: string) {
    const reason = window.prompt('ငြင်းပယ်ရသည့် အကြောင်းအရင်း:');
    if (reason == null) return;
    if (!reason.trim()) {
      pushToast('အကြောင်းအရင်း ထည့်ပါ', 'error');
      return;
    }
    setBusyId(id);
    try {
      await approveDrop(id, false, reason.trim());
      pushToast('Reject လုပ်ပြီးပါပြီ', 'info');
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
        <p className="text-dim">Loading drops...</p>
      </div>
    );
  }

  return (
    <section className="stack">
      <div className="row row--between">
        <h3 className="home-section__title">💸 Pending Drops</h3>
        <span className="badge badge--green">{rows.length} ခု</span>
      </div>

      {rows.length === 0 ? (
        <div className="admin-empty">✓ စောင့်ဆိုင်းနေသော drop မရှိပါ</div>
      ) : null}

      <div className="admin-list">
        {rows.map((r) => {
          const insufficient = r.amount_mmk > (r.live_balance ?? 0);
          return (
            <article key={r.id} className="admin-row">
              <header className="admin-row__head">
                <div>
                  <div className="admin-row__title">{r.user_first_name ?? '(no name)'}</div>
                  <div className="text-dim text-sm">
                    tg:{r.user_telegram_id ?? '?'} · {formatDate(r.created_at)}
                  </div>
                </div>
                <span className="badge badge--amber">⏳ Pending</span>
              </header>

              <div className="admin-detail-row">
                <span className="admin-detail-row__label">ပမာဏ</span>
                <span className="admin-detail-row__value">
                  {formatMMKShort(Number(r.amount_mmk))} MMK
                </span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-row__label">Live Balance</span>
                <span className="admin-detail-row__value">
                  {r.live_balance != null ? `${formatMMK(r.live_balance)} MMK` : '—'}
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
                <span className="admin-detail-row__label">အမည်</span>
                <span className="admin-detail-row__value">{r.account_name ?? '—'}</span>
              </div>

              {insufficient ? (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    background: 'var(--red-soft)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: 'var(--red)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  ⚠️ တောင်းဆိုပမာဏသည် Live Balance ထက် ကျော်လွန်နေသည်
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
                  onClick={() => onReject(r.id)}
                >
                  ✕ Reject
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}