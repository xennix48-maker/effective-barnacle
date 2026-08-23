import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string) ?? '';
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? '';

export const isSupabaseConfigured = Boolean(url) && Boolean(anon);

/**
 * Returns a real Supabase client when env vars are set, otherwise a stub
 * whose methods return `{ data: null, error }` so the app can render a
 * friendly "Configuration missing" page instead of going black.
 *
 * Note: a placeholder URL is used only when env vars are missing, so
 * createClient() does not throw at module-load time. Real API calls will
 * fail with network errors — those are caught by callers and surfaced
 * as warnings or fallback UI.
 */
function makeStubClient(): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_target, prop) {
      if (prop === 'auth') {
        return {
          getSession: async () => ({ data: { session: null }, error: null }),
          getUser: async () => ({ data: { user: null }, error: null }),
          setSession: async () => ({ data: { session: null, user: null }, error: null }),
          signOut: async () => ({ error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        };
      }
      if (prop === 'functions') {
        return { invoke: async () => ({ data: null, error: new Error('Supabase not configured') }) };
      }
      return () => Promise.resolve({ data: null, error: new Error('Supabase not configured'), count: 0 });
    },
  });
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(url, anon, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : makeStubClient();
