import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function AdminLayout() {
  const { loading, isAdmin } = useAuth();

  if (loading) {
    return <div className="page page--centered"><p>ခဏစောင့်ပါ...</p></div>;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page admin-layout">
      <h1 className="page-title">Admin Panel</h1>
      <nav className="admin-nav">
        <NavLink end to="/admin" className={({ isActive }) => `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`}>
          Dashboard
        </NavLink>
        <NavLink to="/admin/purchases" className={({ isActive }) => `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`}>
          Purchases
        </NavLink>
        <NavLink to="/admin/drops" className={({ isActive }) => `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`}>
          Drops
        </NavLink>
        <NavLink to="/admin/users" className={({ isActive }) => `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`}>
          Users
        </NavLink>
        <NavLink to="/admin/settings" className={({ isActive }) => `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`}>
          Settings
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
