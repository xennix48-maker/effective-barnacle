import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  approvePurchase,
  fetchPendingPurchases,
  type Transaction,
} from '../../lib/api';
import { pushToast } from '../../components/Toast';
import { formatDate, formatMMKShort } from '../../lib/format';

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
      // Fetch related machine levels
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

  useEffect(() => {
    void load();
  }, []);

  async function onApprove(id: string) {
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

  async function onReject(id: string) {
    const reason = window.prompt('ငြင်းပယ်ရသည့် �ကြောင်းအရ�်း:');
    if (reason == null) return;
    if (!reason.trim()) {
      pushToast('အကြောင်း�ရင်း ထည့်ပါ', 'error');
      return;
    }
    setBusyId(id);
    try {
      await approvePurchase(id, false, reason.trim());
      pushToast('Reject လုပ�ပြီးပါပြီ', 'info');
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
      <h2 className="page-title">Pending Purchases ({rows.length})</h2>
      {rows.length === 0 ? <p>စောင့်ဆိုင်းနေသော purchase မရှိပါ။</p> : null}
      <div className="admin-list">
        {rows.map((r) => (
          <div key={r.id} className="admin-list__item">
            <div className="admin-list__head">
              <div>
                <b>{r.user_first_name ?? '(no name)'}</b>{' '}
                {r.user_username ? <span className="muted">@{r.user_username}</span> : null}
                {' '}· <span className="muted">tg:{r.user_telegram_id ?? '?'}</span>
              </div>
              <div className="muted">{formatDate(r.created_at)}</div>
            </div>
            <div className="admin-list__row">
              <span>Level</span><b>{r.level ?? '?'}</b>
            </div>
            <div className="admin-list__row">
              <span>ပမာဏ</span><b>{formatMMKShort(Number(r.amount_mmk))} MMK</b>
            </div>
            <div className="admin-list__row">
              <span>ငွေပေးချေမှု</span><b>{r.payment_method ?? '—'}</b>
            </div>
            <div className="admin-list__row">
              <span>ဖုန်း</span><b>{r.phone ?? '—'}</b>
            </div>
            <div className="admin-list__row">
              <span>Last 6</span><b>{r.last6 ?? '—'}</b>
            </div>
            {r.note ? (
              <div className="admin-list__row">
                <span>Note</span><b className="note-cell">{r.note}</b>
              </div>
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
