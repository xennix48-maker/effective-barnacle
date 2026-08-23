import { supabase } from './supabase';
import { getInitData, getStartParam } from './telegram';

export type AuthResult = {
  ok: boolean;
  token_hash: string;
  email: string;
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
 *  - returns a token_hash + email — we then verifyOtp to establish a Supabase session.
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
  if (!data || !data.ok || !data.token_hash || !data.email) {
    throw new Error('No response from tg-auth');
  }

  // Exchange the hashed_token for a Supabase session.
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    email: data.email,
    token: data.token_hash,
    type: 'magiclink',
  });
  if (verifyErr) throw verifyErr;

  return data;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
