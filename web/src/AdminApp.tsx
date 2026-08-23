import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { isSupabaseConfigured } from './lib/supabase';
import { ToastHost } from './components/Toast';
import { Login } from './pages/admin/Login';
import { AdminShell } from './pages/admin/AdminShell';
import { Dashboard } from './pages/admin/Dashboard';
import { Purchases } from './pages/admin/Purchases';
import { Drops } from './pages/admin/Drops';
import { Transactions } from './pages/admin/Transactions';
import { Users } from './pages/admin/Users';
import { UserDetailPage } from './pages/admin/UserDetail';
import { Settings as AdminSettings } from './pages/admin/Settings';

/**
 * Standalone admin shell. Owns its own BrowserRouter so URLs are clean
 * (`/admin/purchases`, not `/#/admin/purchases`). Bypasses the TWA-only
 * `useAuth` flow — uses email/password via `useAdminAuth`.
 */
export function AdminApp() {
  if (!isSupabaseConfigured) {
    return (
      <div className="page page--centered">
        <div className="drop-closed-card">
          <div className="drop-closed-card__icon">⚠️</div>
          <h2>Configuration missing</h2>
          <p className="text-dim text-sm">
            VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set at build time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<Dashboard />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="drops" element={<Drops />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
      <ToastHost />
    </BrowserRouter>
  );
}
