import { supabase } from './supabase';
import { getInitData, getStartParam } from './telegram';

export type AuthResult = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    telegram_id: number;
    is_admin: boolean;
    first_name?: string;
    username?: string;
    referrer_id?: string | null;
  };
};

/**
 * Sign in via Telegram WebApp initData. Calls the tg-auth edge function which:
 *  - validates the HMAC-SHA256 signature
 *  - upserts the user keyed on telegram_id
 *  - parses ?startapp=ref_<tgid> for referral attribution
 *  - mints a Supabase session
 * Returns the session tokens, which we then load via setSession().
 */
export async function signInWithTelegram(): Promise<AuthResult> {
  const initData = getInitData();
  const startParam = getStartParam();

  if (!initData) {
    throw new Error('Not running inside Telegram WebApp');
  }

  const { data, error } = await supabase.functions.invoke<AuthResult>('tg-auth', {
    body: { initData, startParam },
  });

  if (error) throw error;
  if (!data) throw new Error('No response from tg-auth');

  const { access_token, refresh_token } = data;
  const { error: setErr } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (setErr) throw setErr;

  return data;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
