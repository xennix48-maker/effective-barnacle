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
      // Live balances via the snapshot view
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

  useEffect(() => {
    void load();
  }, []);

  async function onApprove(id: string) {
    setBusyId(id);
    try {
      await approveDrop(id, true);
      pushToast('Approve လု�်ပြီးပါပြ�', 'success');
      await load();
    } catch (e: any) {
      pushToast(`မအောင်မြင်ပါ: ${e?.message ?? 'unknown'}`, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(id: string) {
    const reason = window.prompt('ငြင်�ပယ်ရသည့် အက�ောင်းအရင်�:');
    if (reason == null) return;
    if (!reason.trim()) {
      pushToast('အကြောင်း�ရင်း ထည့်ပါ', 'error');
      return;
    }
    setBusyId(id);
    try {
      await approveDrop(id, false, reason.trim());
      pushToast('Reject လ�ပ်ပြီးပါပ�ီ', 'info');
      await load();
    } catch (e: any) {
      pushToast(`မအောင်မြင်ပါ: ${e?.message ?? 'unknown'}`, 'error');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p>ခဏစောင့်ပါ...</p>;

  return (
    <div className="admin-page">
      <h2 className="page-title">Pending Drops ({rows.length})</h2>
      {rows.length === 0 ? <p>စောင့်ဆ�ုင်းနေသော drop မရှိပါ။</p> : null}
      <div className="admin-list">
        {rows.map((r) => (
          <div key={r.id} className="admin-list__item">
            <div className="admin-list__head">
              <div>
                <b>{r.user_first_name ?? '(no name)'}</b>{' '}
                <span className="muted">tg:{r.user_telegram_id ?? '?'}</span>
              </div>
              <div className="muted">{formatDate(r.created_at)}</div>
            </div>
            <div className="admin-list__row">
              <span>ပမာဏ</span><b>{formatMMKShort(Number(r.amount_mmk))} MMK</b>
            </div>
            <div className="admin-list__row">
              <span>Live Balance</span>
              <b className={r.live_balance != null && r.amount_mmk > r.live_balance ? 'text-warn' : ''}>
                {r.live_balance != null ? `${formatMMK(r.live_balance)} MMK` : '—'}
              </b>
            </div>
            <div className="admin-list__row">
              <span>ငွေ�ေးချေမှု</span><b>{r.payment_method ?? '—'}</b>
            </div>
            <div className="admin-list__row">
              <span>ဖုန်း</span><b>{r.phone ?? '—'}</b>
            </div>
            <div className="admin-list__row">
              <span>အမည�</span><b>{r.account_name ?? '—'}</b>
            </div>
            {r.amount_mmk > (r.live_balance ?? 0) ? (
              <p className="text-warn" style={{ fontSize: 12, marginTop: 6 }}>
                ⚠️ တောင်းဆိုပမာဏသည် Live Balance ထက် ကျော်လွန်နေသည်
              </p>
            ) : null}
            <div className="admin-list__actions">
              <button
                className="cta-btn cta-btn--small cta-btn--approve"
                disabled={busyId === r.id}
                onClick={() => onApprove(r.id)}
              >Approve</button>
              <button
                className="cta-btn cta-btn--small cta-btn--reject"
                disabled={busyId === r.id}
                onClick={() => onReject(r.id)}
              >Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
