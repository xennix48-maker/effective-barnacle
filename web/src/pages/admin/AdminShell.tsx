import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { supabase } from '../../lib/supabase';

const ADMIN_TABS = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/purchases', label: 'Purchases', icon: '🛒' },
  { to: '/admin/drops', label: 'Drops', icon: '💸' },
  { to: '/admin/transactions', label: 'History', icon: '📜' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

/**
 * Standalone admin layout. Mirrors the TWA AdminLayout but reads auth from
 * useAdminAuth (email/password) instead of useAuth (Telegram). Unauthenticated
 * visitors are redirected to /admin/login; non-admin sessions bounce there too.
 */
export function AdminShell() {
  const { loading, isAdmin, session } = useAdminAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="app-shell">
        <div className="empty">
          <div className="spinner" style={{ margin: '0 auto 8px' }} />
          <p className="text-dim">Loading…</p>
        </div>
      </div>
    );
  }
  if (!session || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="app-shell admin-layout">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">⚙️ Admin Panel</h1>
          <p className="page-header__sub">BITCOIN MINING Console</p>
        </div>
        <button
          className="btn btn--ghost btn--sm"
          onClick={signOut}
          aria-label="Sign out"
        >
          Sign out
        </button>
      </div>

      <nav className="admin-tabs" aria-label="Admin sections">
        {ADMIN_TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `admin-tabs__btn ${isActive ? 'admin-tabs__btn--active' : ''}`
            }
          >
            <span style={{ marginRight: 6 }}>{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
