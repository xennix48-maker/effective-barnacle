import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchTransactionsAdmin, fetchUserDetail, setUserAdmin, type UserDetail } from '../../lib/api';
import { formatDate, formatMMK, formatMMKShort } from '../../lib/format';
import { pushToast } from '../../components/Toast';
import { openLink } from '../../lib/telegram';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<UserDetail & { live_balance: number; live_rate: number } | null>(null);
  const [txns, setTxns] = useState<Array<{ id: string; kind: string; amount_mmk: number; status: string; created_at: string; reject_reason?: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      try {
        const detail = await fetchUserDetail(id);
        setData(detail as any);
        const t = await fetchTransactionsAdmin({ user_id: id, limit: 100 });
        setTxns(t as any);
      } catch (e: any) {
        pushToast(`User load မရပါ: ${e?.message ?? ''}`, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function toggleAdmin() {
    if (!data) return;
    setToggling(true);
    try {
      await setUserAdmin(data.user.id, !data.user.is_admin);
      pushToast(data.user.is_admin ? 'Admin revoked' : 'Admin granted', 'success');
      setData({ ...data, user: { ...data.user, is_admin: !data.user.is_admin } });
    } catch (e: any) {
      pushToast(`မအောင်မြင်ပါ: ${e?.message ?? ''}`, 'error');
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <div className="empty">
        <div className="spinner" style={{ margin: '0 auto 8px' }} />
        <p className="text-dim">Loading user…</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="admin-empty">
        <div>User မတွေ့ပါ</div>
        <button className="btn btn--ghost mt-12" onClick={() => navigate('/admin/users')}>
          ← ပြန်သွားမည်
        </button>
      </div>
    );
  }

  const u = data.user;
  const balance = data.live_balance;
  const rate = data.live_rate;

  return (
    <section className="stack">
      <button
        className="btn btn--ghost"
        onClick={() => navigate('/admin/users')}
        style={{ alignSelf: 'flex-start' }}
      >
        ← Users စာရင်း
      </button>

      {/* Profile */}
      <div className="card">
        <div className="row" style={{ gap: 14, alignItems: 'center' }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: u.is_admin
                ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)'
                : 'var(--bg-3)',
              color: u.is_admin ? '#1a0f00' : 'var(--text)',
              display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 22,
            }}
          >
            {(u.first_name ?? u.username ?? '?').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="fw-800" style={{ fontSize: 17 }}>
              {u.first_name ?? '(no name)'}
              {u.is_admin ? <span className="badge badge--accent" style={{ marginLeft: 8 }}>Admin</span> : null}
            </div>
            <div className="text-dim text-sm">
              {u.username ? `@${u.username} · ` : ''}tg:{u.telegram_id ?? '?'}
            </div>
            <div className="text-mute text-sm">Joined {formatDate(u.created_at)}</div>
          </div>
        </div>

        <div className="admin-detail-row mt-12">
          <span className="admin-detail-row__label">Live Balance</span>
          <span className="admin-detail-row__value text-accent fw-700">
            {formatMMK(balance)} MMK
          </span>
        </div>
        <div className="admin-detail-row">
          <span className="admin-detail-row__label">Rate / sec</span>
          <span className="admin-detail-row__value text-mono">{formatMMK(rate)} MMK/s</span>
        </div>
        <div className="admin-detail-row">
          <span className="admin-detail-row__label">Machines</span>
          <span className="admin-detail-row__value">{data.machines.length}</span>
        </div>
        <div className="admin-detail-row">
          <span className="admin-detail-row__label">Referrals</span>
          <span className="admin-detail-row__value">
            {data.paid_referrals_made} / {data.referrals_made} paid
          </span>
        </div>

        <div className="row mt-12" style={{ gap: 8 }}>
          {u.telegram_id ? (
            <button
              className="btn btn--ghost"
              onClick={() => openLink(`https://t.me/user/${u.telegram_id}`)}
            >
              ✈️ Telegram ဖွင့်မည်
            </button>
          ) : null}
          <button className="btn btn--primary" onClick={toggleAdmin} disabled={toggling}>
            {toggling
              ? '...'
              : u.is_admin
              ? 'Admin ရုပ်သိမ်းမည်'
              : 'Admin ခန့်မည်'}
          </button>
        </div>
      </div>

      {/* Machines */}
      <div className="card">
        <h3 className="card__title">⛏️ စက်များ ({data.machines.length})</h3>
        {data.machines.length === 0 ? (
          <p className="text-dim text-sm">စက် မရှိသေးပါ။</p>
        ) : (
          <div className="stack stack--sm">
            {data.machines.map((m) => (
              <div key={m.id} className="admin-detail-row">
                <span className="admin-detail-row__label">
                  {m.level} · {formatMMKShort(Number(m.price_paid_mmk))} MMK
                </span>
                <span
                  className={`badge ${
                    m.status === 'active'
                      ? 'badge--green'
                      : m.status === 'rejected'
                      ? 'badge--red'
                      : 'badge--amber'
                  }`}
                >
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="card">
        <h3 className="card__title">📜 Transactions ({txns.length})</h3>
        {txns.length === 0 ? (
          <p className="text-dim text-sm">Transaction မရှိသေးပါ။</p>
        ) : (
          <div className="stack stack--sm">
            {txns.map((t) => (
              <div key={t.id} className="admin-detail-row">
                <span className="admin-detail-row__label">
                  {t.kind === 'purchase'
                    ? '🛒'
                    : t.kind === 'drop'
                    ? '💸'
                    : '🎁'}{' '}
                  {formatMMKShort(Number(t.amount_mmk))} MMK · {formatDate(t.created_at)}
                </span>
                <span
                  className={`badge ${
                    t.status === 'approved'
                      ? 'badge--green'
                      : t.status === 'rejected'
                      ? 'badge--red'
                      : 'badge--amber'
                  }`}
                >
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
