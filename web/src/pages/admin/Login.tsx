import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { pushToast } from '../../components/Toast';

const DEFAULT_EMAIL = 'tg_8915316853@btcak.local';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const next = (location.state as { from?: string } | null)?.from ?? '/admin';
      navigate(next, { replace: true });
    } catch (e: any) {
      pushToast(`Sign-in failed: ${e?.message ?? 'unknown'}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page page--centered">
      <form
        className="card"
        onSubmit={onSubmit}
        style={{ width: 'min(360px, calc(100vw - 32px))', padding: 24 }}
      >
        <h2 style={{ marginBottom: 16 }}>⚙️ Admin Sign-in</h2>
        <div className="field">
          <label className="field__label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
        <div className="field">
          <label className="field__label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            autoComplete="current-password"
          />
        </div>
        <button
          className="btn btn--primary btn--block"
          disabled={busy}
          type="submit"
          style={{ marginTop: 8 }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-dim text-sm" style={{ marginTop: 12, textAlign: 'center' }}>
          Direct browser access for the sole admin. Telegram WebApp not required.
        </p>
      </form>
    </div>
  );
}
