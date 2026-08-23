import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/format';

type UserRow = {
  id: string;
  telegram_id: number;
  first_name?: string;
  username?: string;
  is_admin: boolean;
  created_at: string;
};

export function Users() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('users')
      .select('id,telegram_id,first_name,username,is_admin,created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    setUsers((data ?? []) as UserRow[]);
    setLoading(false);
  }

  const filtered = users.filter((u) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      String(u.telegram_id).includes(s) ||
      (u.first_name ?? '').toLowerCase().includes(s) ||
      (u.username ?? '').toLowerCase().includes(s)
    );
  });

  return (
    <section className="stack">
      <div className="row row--between">
        <h3 className="home-section__title">👥 Users</h3>
        <span className="badge badge--blue">{filtered.length} / {users.length}</span>
      </div>

      <div className="field">
        <input
          className="input"
          placeholder="🔍 Search by telegram_id, name, @username"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="empty">
          <div className="spinner" style={{ margin: '0 auto 8px' }} />
          <p className="text-dim">Loading users...</p>
        </div>
      ) : null}

      <div className="admin-list">
        {filtered.map((u) => {
          const initials = (u.first_name ?? u.username ?? '?').charAt(0).toUpperCase();
          return (
            <article key={u.id} className="admin-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: u.is_admin
                    ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)'
                    : 'var(--bg-3)',
                  color: u.is_admin ? '#1a0f00' : 'var(--text)',
                  display: 'grid', placeItems: 'center',
                  fontWeight: 800, fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="admin-row__title">
                  {u.first_name ?? '(no name)'}
                  {u.is_admin ? <span className="badge badge--accent" style={{ marginLeft: 6 }}>Admin</span> : null}
                </div>
                <div className="text-dim text-sm">
                  {u.username ? `@${u.username} · ` : ''}
                  tg:{u.telegram_id}
                </div>
              </div>
              <div className="text-mute text-sm" style={{ flexShrink: 0 }}>
                {formatDate(u.created_at)}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}