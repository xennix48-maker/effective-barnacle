import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { signInWithTelegram } from '../lib/auth';
import { fetchUserProfile } from '../lib/api';
import { getInitData, isInsideTelegram, ready } from '../lib/telegram';
import { pushToast } from '../components/Toast';
import type { Session, User } from '@supabase/supabase-js';

export type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  telegramId: number | null;
  /** When Telegram sign-in fails (HMAC mismatch, network, etc.) this captures the reason. */
  authError: string | null;
  /** Telegram's web-app script is loaded and reports a platform — we're in some kind of Telegram webview. */
  insideTelegram: boolean;
  /**
   * True when initData is missing inside a Telegram webview — typically means
   * the user opened the URL via a chat link rather than a `web_app` button.
   * UI should ask them to reopen via the bot menu / inline button.
   */
  outsideTelegram: boolean;
};

const initial: AuthState = {
  loading: true,
  session: null,
  user: null,
  isAdmin: false,
  telegramId: null,
  authError: null,
  insideTelegram: false,
  outsideTelegram: false,
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

      // Try Telegram sign-in. The reliable signal that we're inside Telegram is
      // the signed initData string — even if initDataUnsafe.user is missing on
      // some platforms, initData is set whenever the WebApp launched from a bot.
      const initData = getInitData();
      const insideTg = isInsideTelegram();
      if (!initData) {
        // No signed data. Two cases:
        //   - in Telegram webview but URL opened via plain chat link → ask user
        //     to reopen via the bot's menu / inline web_app button
        //   - not in Telegram at all (regular browser) → "open in Telegram"
        setState({ ...initial, loading: false, outsideTelegram: true, insideTelegram: insideTg });
        return;
      }

      try {
        await signInWithTelegram();
        const { data: after } = await supabase.auth.getSession();
        if (cancelled) return;
        if (after.session) applySession(after.session);
        else setState({ ...initial, loading: false, authError: 'No session after sign-in' });
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error('[auth] signInWithTelegram failed', e);
        const msg = e?.message ?? String(e);
        pushToast(`Sign-in failed: ${msg}`, 'error');
        setState({ ...initial, loading: false, authError: msg });
      }
    }

    function applySession(session: Session) {
      const claims = (session.user?.app_metadata ?? {}) as Record<string, unknown>;
      let isAdmin = Boolean(claims.is_admin);
      let telegramId =
        typeof claims.telegram_id === 'number'
          ? (claims.telegram_id as number)
          : null;

      // Fallback: if the JWT doesn't carry telegram_id / is_admin claims (Custom
      // Access Token Hook inactive), pull them from public.users so the rest of
      // the app still works.
      if (telegramId === null || !isAdmin) {
        fetchUserProfile(session.user.id)
          .then((profile) => {
            if (!profile) return;
            if (telegramId === null && profile.telegram_id !== null) {
              telegramId = profile.telegram_id;
            }
            if (!isAdmin && profile.is_admin) isAdmin = true;
            setState({
              loading: false,
              session,
              user: session.user,
              isAdmin,
              telegramId,
              authError: null,
              insideTelegram: true,
              outsideTelegram: false,
            });
          })
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.warn('[auth] profile fallback failed', err);
          });
      }

      setState({
        loading: false,
        session,
        user: session.user,
        isAdmin,
        telegramId,
        authError: null,
        insideTelegram: true,
        outsideTelegram: false,
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
