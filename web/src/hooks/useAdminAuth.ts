import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchUserProfile } from '../lib/api';
import type { Session, User } from '@supabase/supabase-js';

export type AdminAuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
};

/**
 * Email/password auth hook for the standalone admin shell. Does NOT use
 * Telegram initData or call tg-auth. Derives isAdmin from public.users
 * (self-read RLS always works) rather than the JWT claim, so this works
 * even if the Custom Access Token Hook doesn't fire on password grant.
 */
export function useAdminAuth(): AdminAuthState {
  const [state, setState] = useState<AdminAuthState>({
    loading: true,
    session: null,
    user: null,
    isAdmin: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        setState({ loading: false, session: null, user: null, isAdmin: false });
        return;
      }
      const profile = await fetchUserProfile(data.session.user.id);
      if (cancelled) return;
      setState({
        loading: false,
        session: data.session,
        user: data.session.user,
        isAdmin: Boolean(profile?.is_admin),
      });
    }

    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s) void load();
      else setState({ loading: false, session: null, user: null, isAdmin: false });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
