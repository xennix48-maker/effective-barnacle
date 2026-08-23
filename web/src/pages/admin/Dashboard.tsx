import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Stats = {
  total_users: number;
  active_machines: number;
  pending_purchases: number;
  pending_drops: number;
  approved_purchases_today: number;
  approved_drops_today: number;
};

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const [users, activeMachines, pendPurchases, pendDrops, approvedToday] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('user_machines').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('kind', 'purchase').eq('status', 'pending'),
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('kind', 'drop').eq('status', 'pending'),
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .gte('decided_at', new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString())
        .eq('status', 'approved'),
    ]);

    setStats({
      total_users: users.count ?? 0,
      active_machines: activeMachines.count ?? 0,
      pending_purchases: pendPurchases.count ?? 0,
      pending_drops: pendDrops.count ?? 0,
      approved_purchases_today: approvedToday.count ?? 0,
      approved_drops_today: 0,
    });
  }

  if (!stats) return <p>ခဏ�ောင့်ပါ...</p>;

  const tiles = [
    { label: 'စုစုပေါင်း Users', value: stats.total_users },
    { label: 'အလုပ်လုပ်နေသော စက်', value: stats.active_machines },
    { label: 'စစ်ဆေးရန် Purchase', value: stats.pending_purchases, accent: true },
    { label: 'စစ်ဆေးရန် Drop', value: stats.pending_drops, accent: true },
    { label: 'ယနေ့ Approve (Purchase)', value: stats.approved_purchases_today },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        {tiles.map((t) => (
          <div key={t.label} className={`dashboard-tile ${t.accent ? 'dashboard-tile--accent' : ''}`}>
            <div className="dashboard-tile__value">{t.value}</div>
            <div className="dashboard-tile__label">{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
