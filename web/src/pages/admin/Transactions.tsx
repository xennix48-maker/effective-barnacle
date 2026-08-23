import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { fetchTransactionsAdmin, type Transaction } from '../../lib/api';
import { formatDate, formatMMKShort } from '../../lib/format';

type Tab = 'all' | 'pending' | 'approved' | 'rejected';

export function Transactions() {
  const [tab, setTab] = useState<Tab>('all');
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMap, setUserMap] = useState<Map<string, { first_name?: string; telegram_id?: number }>>(
    new Map()
  );

  useEffect(() => {
    void load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function load(t: Tab) {
    setLoading(true);
    try {
      const filter = t === 'all' ? {} : { status: t as 'pending' | 'approved' | 'rejected' };
      const txns = await fetchTransactionsAdmin(filter);
      setRows(txns);
      const userIds = Array.from(new Set(txns.map((x) => x.user_id).filter(Boolean))) as string[];
      if (userIds.length) {
        const { data: users } = await supabase
          .from('users')
          .select('id,first_name,telegram_id')
          .in('id', userIds);
        const m = new Map<string, { first_name?: string; telegram_id?: number }>();
        for (const u of users ?? []) m.set(u.id as string, u as any);
        setUserMap(m);
      } else {
        setUserMap(new Map());
      }
    } finally {
      setLoading(false);
    }
  }

  const KIND_LABEL: Record<Transaction['kind'], string> = {
    purchase: '🛒 ဝယ်ယူ',
    drop: '💸 drop',
    referral_bonus: '🎁 refer',
  };

  return (
    <section className="stack">
      <div className="row row--between">
        <h3 className="home-section__title">📜 Transactions</h3>
        <span className="badge badge--blue">{rows.length} ခု</span>
      </div>

      {/* Tabs */}
      <div className="filter-pills">
        {(['all', 'pending', 'approved', 'rejected'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`filter-pill ${tab === t ? 'filter-pill--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'all'
              ? 'အကုန်'
              : t === 'pending'
              ? '⏳ Pending'
              : t === 'approved'
              ? '✓ Approved'
              : '✕ Rejected'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty">
          <div className="spinner" style={{ margin: '0 auto 8px' }} />
          <p className="text-dim">Loading…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="admin-empty">— မရှိသေးပါ —</div>
      ) : (
        <div className="admin-list">
          {rows.map((r) => {
            const u = r.user_id ? userMap.get(r.user_id) : undefined;
            const statusBadge =
              r.status === 'approved'
                ? 'badge--green'
                : r.status === 'rejected'
                ? 'badge--red'
                : 'badge--amber';
            return (
              <article key={r.id} className="admin-row">
                <header className="admin-row__head">
                  <div>
                    <div className="admin-row__title">
                      {KIND_LABEL[r.kind]} · {formatMMKShort(Number(r.amount_mmk))} MMK
                    </div>
                    <div className="text-dim text-sm">
                      {u?.first_name ?? '(no name)'}
                      {u?.telegram_id ? ` · tg:${u.telegram_id}` : ''} · {formatDate(r.created_at)}
                    </div>
                  </div>
                  <span className={`badge ${statusBadge}`}>{r.status}</span>
                </header>

                {r.reject_reason ? (
                  <div className="admin-detail-row">
                    <span className="admin-detail-row__label">Reason</span>
                    <span className="admin-detail-row__value" style={{ maxWidth: '60%', textAlign: 'right' }}>
                      {r.reject_reason}
                    </span>
                  </div>
                ) : null}
                {r.decided_at ? (
                  <div className="admin-detail-row">
                    <span className="admin-detail-row__label">Decided</span>
                    <span className="admin-detail-row__value text-dim text-sm">
                      {formatDate(r.decided_at)}
                    </span>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
