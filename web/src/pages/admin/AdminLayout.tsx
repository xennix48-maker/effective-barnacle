import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ADMIN_TABS = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/purchases', label: 'Purchases', icon: '🛒' },
  { to: '/admin/drops', label: 'Drops', icon: '💸' },
  { to: '/admin/transactions', label: 'History', icon: '📜' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export function AdminLayout() {
  const { loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="app-shell">
        <div className="empty">
          <div className="spinner" style={{ margin: '0 auto 8px' }} />
          <p className="text-dim">ခဏစောင့်ပါ...</p>
        </div>
      </div>
    );
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app-shell admin-layout">
      <div className="page-header">
        <button
          className="page-header__back"
          onClick={() => navigate('/')}
          aria-label="ပြန်သွားမည်"
        >
          ←
        </button>
        <div>
          <h1 className="page-header__title">⚙️ Admin Panel</h1>
          <p className="page-header__sub">BITCOIN MINING Console</p>
        </div>
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