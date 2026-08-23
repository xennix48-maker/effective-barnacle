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

  useEffect(() => {
    void load();
  }, []);

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
    <div className="admin-page">
      <h2 className="page-title">Users ({users.length})</h2>
      <input
        className="form-input"
        placeholder="Search by telegram_id, name, @username"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {loading ? <p>ခဏစောင့်ပါ...</p> : null}
      <div className="admin-list">
        {filtered.map((u) => (
          <div key={u.id} className="admin-list__item">
            <div className="admin-list__row">
              <span>Name</span>
              <b>{u.first_name ?? '—'} {u.username ? `@${u.username}` : ''}</b>
            </div>
            <div className="admin-list__row">
              <span>Telegram ID</span>
              <b>{u.telegram_id}{u.is_admin ? ' (admin)' : ''}</b>
            </div>
            <div className="admin-list__row admin-list__row--small">
              <span>Joined</span>
              <span>{formatDate(u.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
