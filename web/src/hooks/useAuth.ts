import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { signInWithTelegram } from '../lib/auth';
import { getTelegramUser, ready } from '../lib/telegram';
import type { Session, User } from '@supabase/supabase-js';

export type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  telegramId: number | null;
};

const initial: AuthState = {
  loading: true,
  session: null,
  user: null,
  isAdmin: false,
  telegramId: null,
};

/**
 * Loads session from supabase.auth, signs in via Telegram if none.
 * Exposes the JWT claims (is_admin, telegram_id) for use in components.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(initial);

  useEffect(() => {
    let cancelled = false;

    ready();

    async function load() {
      // First, check for existing session
      const { data: sessData } = await supabase.auth.getSession();
      if (cancelled) return;

      if (sessData.session) {
        applySession(sessData.session);
        return;
      }

      // Try Telegram sign-in
      const tg = getTelegramUser();
      if (!tg) {
        // Running outside Telegram — surface no session, no auth attempt
        setState({ ...initial, loading: false });
        return;
      }

      try {
        await signInWithTelegram();
        const { data: after } = await supabase.auth.getSession();
        if (cancelled) return;
        if (after.session) applySession(after.session);
        else setState({ ...initial, loading: false });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[auth] signInWithTelegram failed', e);
        setState({ ...initial, loading: false });
      }
    }

    function applySession(session: Session) {
      const claims = (session.user?.app_metadata ?? {}) as Record<string, unknown>;
      const isAdmin = Boolean(claims.is_admin);
      const telegramId =
        typeof claims.telegram_id === 'number'
          ? (claims.telegram_id as number)
          : null;
      setState({
        loading: false,
        session,
        user: session.user,
        isAdmin,
        telegramId,
      });
    }

    load();

    // Subscribe to session changes (refresh, sign-out)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        applySession(session);
      } else {
        setState({ ...initial, loading: false });
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
