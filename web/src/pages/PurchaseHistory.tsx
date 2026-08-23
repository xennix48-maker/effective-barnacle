import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchTransactionsAdmin, type Transaction } from '../lib/api';
import { supabase } from '../lib/supabase';
import { formatDate, formatMMKShort } from '../lib/format';

const KIND_LABEL: Record<Transaction['kind'], string> = {
  purchase: '🛒 ဝယ်ယူ',
  drop: '💸 Drop',
  referral_bonus: '🎁 Refer Bonus',
};

export function PurchaseHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      // User-scoped: fetch their own transactions. RLS gates to user_id=auth.uid().
      const { data, error } = await supabase
        .from('transactions')
        .select(
          'id,kind,amount_mmk,status,payment_method,phone,account_name,last6,note,screenshot_url,reject_reason,created_at,decided_at,related_machine'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setRows((data ?? []) as Transaction[]);
    } catch {
      // RLS might block, fall back to fetching via the admin edge-call only
      // if the user is admin (otherwise an empty state is correct).
      try {
        const all = await fetchTransactionsAdmin({ user_id: user.id, limit: 100 });
        setRows(all);
      } catch {
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  }

  const purchases = rows.filter((r) => r.kind === 'purchase');
  const drops = rows.filter((r) => r.kind === 'drop');
  const bonuses = rows.filter((r) => r.kind === 'referral_bonus');

  function StatusBadge({ status }: { status: Transaction['status'] }) {
    const cls =
      status === 'approved' ? 'badge--green' : status === 'rejected' ? 'badge--red' : 'badge--amber';
    return <span className={`badge ${cls}`}>{status}</span>;
  }

  function TxRow({ r }: { r: Transaction }) {
    return (
      <article className="history-row">
        <header className="history-row__head">
          <div className="history-row__title">
            {KIND_LABEL[r.kind]} · {formatMMKShort(Number(r.amount_mmk))} MMK
          </div>
          <StatusBadge status={r.status} />
        </header>
        <div className="history-row__meta">
          {formatDate(r.created_at)}
          {r.payment_method ? ` · ${r.payment_method.toUpperCase()}` : ''}
          {r.last6 ? ` · last6 ${r.last6}` : ''}
          {r.phone ? ` · ${r.phone}` : ''}
        </div>
        {r.note ? <div className="history-row__meta">📝 {r.note}</div> : null}
        {r.reject_reason ? (
          <div className="history-row__meta" style={{ color: 'var(--red)' }}>
            ✕ {r.reject_reason}
          </div>
        ) : null}
        {r.screenshot_url ? (
          <a
            className="history-row__receipt"
            href={r.screenshot_url}
            target="_blank"
            rel="noreferrer"
          >
            <img src={r.screenshot_url} alt="receipt" />
          </a>
        ) : null}
      </article>
    );
  }

  return (
    <div className="app-shell">
      <div className="page-header">
        <button
          className="page-header__back"
          onClick={() => navigate(-1)}
          aria-label="ပြန်သွားမည်"
        >
          ←
        </button>
        <div>
          <h1 className="page-header__title">📜 စက်ဝယ်ယူမှု မှတ်တမ်း</h1>
          <p className="page-header__sub">ဝယ်ယူ · Drop · Refer Bonus မှတ်တမ်း</p>
        </div>
      </div>

      {loading ? (
        <div className="empty">
          <div className="spinner" style={{ margin: '0 auto 8px' }} />
          <p className="text-dim">Loading…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="empty">
          <div className="empty__icon">📜</div>
          <h3 className="empty__title">မှတ်တမ်းမရှိသေးပါ</h3>
          <p className="empty__sub">စက်ဝယ်ယူပြီးပါက ဤနေရာတွင် မြင်ရမည်။</p>
        </div>
      ) : (
        <div className="stack">
          {purchases.length > 0 ? (
            <section>
              <h3 className="home-section__title">🛒 ဝယ်ယူမှုများ ({purchases.length})</h3>
              <div className="history-list mt-12">
                {purchases.map((r) => (
                  <TxRow key={r.id} r={r} />
                ))}
              </div>
            </section>
          ) : null}
          {drops.length > 0 ? (
            <section>
              <h3 className="home-section__title">💸 Drop များ ({drops.length})</h3>
              <div className="history-list mt-12">
                {drops.map((r) => (
                  <TxRow key={r.id} r={r} />
                ))}
              </div>
            </section>
          ) : null}
          {bonuses.length > 0 ? (
            <section>
              <h3 className="home-section__title">🎁 Refer Bonus ({bonuses.length})</h3>
              <div className="history-list mt-12">
                {bonuses.map((r) => (
                  <TxRow key={r.id} r={r} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}