import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Home } from './pages/Home';
import { Buy } from './pages/Buy';
import { MyMachines } from './pages/MyMachines';
import { Drop } from './pages/Drop';
import { Refer } from './pages/Refer';
import { NotAuthorized } from './pages/NotAuthorized';
import { AdminLayout } from './pages/admin/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { Purchases } from './pages/admin/Purchases';
import { Drops } from './pages/admin/Drops';
import { Settings as AdminSettings } from './pages/admin/Settings';
import { Users } from './pages/admin/Users';
import { Transactions } from './pages/admin/Transactions';
import { UserDetailPage } from './pages/admin/UserDetail';
import { ToastHost } from './components/Toast';
import { BottomNav } from './components/BottomNav';

export function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading__logo">₿</div>
        <div className="spinner" />
        <p>ခဏစောင့်ပါ...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/buy/:level" element={<Buy />} />
        <Route path="/machines" element={<MyMachines />} />
        <Route path="/drop" element={<Drop />} />
        <Route path="/refer" element={<Refer />} />
        <Route path="/not-authorized" element={<NotAuthorized />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="drops" element={<Drops />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Hidden admin entry — same panel, different URL */}
        <Route path="/admin67" element={<Navigate to="/admin" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastHost />
      <BottomNav />
    </HashRouter>
  );
}