import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Stats = {
  total_users: number;
  active_machines: number;
  pending_purchases: number;
  pending_drops: number;
  approved_today: number;
  paid_referrals: number;
  total_refer_bonus: number;
};

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const today = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();
    const [users, activeMachines, pendPurchases, pendDrops, approvedToday, paidRefs, bonuses] =
      await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('user_machines').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('kind', 'purchase').eq('status', 'pending'),
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('kind', 'drop').eq('status', 'pending'),
        supabase.from('transactions').select('id', { count: 'exact', head: true }).gte('decided_at', today).eq('status', 'approved'),
        supabase.from('referrals').select('id', { count: 'exact', head: true }).eq('paid', true),
        supabase.from('transactions').select('amount_mmk').eq('kind', 'referral_bonus').eq('status', 'approved'),
      ]);

    const totalBonus = (bonuses.data ?? []).reduce(
      (s, r: any) => s + Number(r.amount_mmk),
      0
    );

    setStats({
      total_users: users.count ?? 0,
      active_machines: activeMachines.count ?? 0,
      pending_purchases: pendPurchases.count ?? 0,
      pending_drops: pendDrops.count ?? 0,
      approved_today: approvedToday.count ?? 0,
      paid_referrals: paidRefs.count ?? 0,
      total_refer_bonus: totalBonus,
    });
  }

  if (!stats) {
    return (
      <div className="empty">
        <div className="spinner" style={{ margin: '0 auto 8px' }} />
        <p className="text-dim">Loading dashboard...</p>
      </div>
    );
  }

  const pendingTotal = stats.pending_purchases + stats.pending_drops;

  return (
    <section className="stack">
      {/* Alert banner if pending */}
      {pendingTotal > 0 ? (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(247, 147, 26, 0.18) 0%, transparent 100%)',
            borderColor: 'rgba(247, 147, 26, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--accent)', color: '#1a0f00',
              display: 'grid', placeItems: 'center', fontWeight: 800,
            }}
          >
            {pendingTotal}
          </div>
          <div style={{ flex: 1 }}>
            <div className="fw-700">စစ်ဆေးရန် အရောင်းအဝယ်များ</div>
            <div className="text-dim text-sm">
              Purchase {stats.pending_purchases} · Drop {stats.pending_drops}
            </div>
          </div>
        </div>
      ) : null}

      {/* Main stats */}
      <div className="admin-grid">
        <div className="admin-stat admin-stat--accent">
          <div className="admin-stat__label">⛏️ အလုပ်လုပ်နေသော စက်</div>
          <div className="admin-stat__value">{stats.active_machines}</div>
          <div className="admin-stat__sub">Per-second ဝင်ငွေ generating</div>
        </div>
        <div className="admin-stat admin-stat--blue">
          <div className="admin-stat__label">👥 Users</div>
          <div className="admin-stat__value">{stats.total_users}</div>
          <div className="admin-stat__sub">Telegram accounts</div>
        </div>
        <div className="admin-stat admin-stat--green">
          <div className="admin-stat__label">✅ ယနေ့ Approve</div>
          <div className="admin-stat__value">{stats.approved_today}</div>
          <div className="admin-stat__sub">ယနေ့ ဆုံးဖြတ်ချက်များ</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__label">🎁 Refer Bonus</div>
          <div className="admin-stat__value">{stats.paid_referrals}</div>
          <div className="admin-stat__sub">
            {stats.total_refer_bonus.toLocaleString()} MMK paid
          </div>
        </div>
      </div>

      {/* Quick action cards */}
      <div>
        <h3 className="home-section__title mt-8">⚡ Quick Actions</h3>
        <div className="stack mt-12">
          <a href="#/admin/purchases" className="admin-row">
            <div className="row row--between">
              <div className="row">
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'var(--accent-soft)', color: 'var(--accent)',
                    display: 'grid', placeItems: 'center', fontSize: 20,
                  }}
                >
                  🛒
                </div>
                <div>
                  <div className="admin-row__title">Pending Purchases</div>
                  <div className="text-dim text-sm">စက်ဝယ်ယူမှုများ စစ်ဆေးရန်</div>
                </div>
              </div>
              <span className="badge badge--accent">{stats.pending_purchases}</span>
            </div>
          </a>
          <a href="#/admin/drops" className="admin-row">
            <div className="row row--between">
              <div className="row">
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'var(--green-soft)', color: 'var(--green)',
                    display: 'grid', placeItems: 'center', fontSize: 20,
                  }}
                >
                  💸
                </div>
                <div>
                  <div className="admin-row__title">Pending Drops</div>
                  <div className="text-dim text-sm">ငွေထုတ်ယူမှုများ စစ်ဆေးရန်</div>
                </div>
              </div>
              <span className="badge badge--green">{stats.pending_drops}</span>
            </div>
          </a>
          <a href="#/admin/settings" className="admin-row">
            <div className="row row--between">
              <div className="row">
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'var(--blue-soft)', color: 'var(--blue)',
                    display: 'grid', placeItems: 'center', fontSize: 20,
                  }}
                >
                  ⚙️
                </div>
                <div>
                  <div className="admin-row__title">Settings</div>
                  <div className="text-dim text-sm">Drop toggle · Machine catalog · Payment numbers</div>
                </div>
              </div>
              <span style={{ fontSize: 18, opacity: 0.5 }}>→</span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}