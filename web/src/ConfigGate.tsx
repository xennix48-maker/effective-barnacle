import { isSupabaseConfigured } from './lib/supabase';

/**
 * Renders a friendly configuration-missing page when Supabase env vars
 * aren't set, instead of letting the app go black.
 */
export function ConfigGate({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured) return <>{children}</>;
  return (
    <div className="page page--centered">
      <div className="drop-closed-card">
        <div className="drop-closed-card__icon">⚙️</div>
        <h2>Configuration missing</h2>
        <p>
          <code>VITE_SUPABASE_URL</code> နှင့် <code>VITE_SUPABASE_ANON_KEY</code> ကို Vercel
          project settings တွင် ထည�်သွင်းပြီ� redeploy လုပ်ပါ။
        </p>
        <p style={{ fontSize: 12, marginTop: 12, opacity: 0.7 }}>
          Supabase Dashboard → Project Settings → API → Project URL + anon public key
        </p>
      </div>
    </div>
  );
}
