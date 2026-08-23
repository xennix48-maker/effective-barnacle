import WebApp from '@twa-dev/sdk';

export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  is_premium?: boolean;
};

type UnsafeInitData = {
  user?: TelegramUser;
  start_param?: string;
};

function unsafe(): UnsafeInitData {
  // SDK exposes initDataUnsafe as a record with user/start_param
  return ((WebApp as any).initDataUnsafe as UnsafeInitData) ?? {};
}

export function getInitData(): string {
  return WebApp.initData || '';
}

export function getStartParam(): string | undefined {
  return unsafe().start_param;
}

/**
 * Reliable "are we running inside Telegram at all" signal.
 *
 * Telegram's web-app polyfill defaults `WebApp.platform` to `'unknown'` and
 * leaves `initData` empty when the URL fragment has no `tgWebApp*` params —
 * which is exactly what happens when a user opens the deployed URL in a
 * regular mobile browser. So `platform !== 'unknown'` alone is not enough.
 *
 * A real Telegram WebView populates at least one of these from the URL hash
 * even when the user opens via a plain menu button (no `start_param`):
 *   - WebApp.platform          → 'ios' | 'android' | 'macos' | 'tdesktop' | 'web' | 'weba'
 *   - WebApp.initDataUnsafe.user (present whenever tgWebAppData was injected)
 *   - WebApp.colorScheme       → 'light' | 'dark' (polyfill defaults to 'light')
 *   - WebApp.themeParams       → non-empty object (polyfill defaults to {})
 *
 * If any of those look "real" (not the polyfill default), we're in Telegram.
 */
export function isInsideTelegram(): boolean {
  try {
    const wa = WebApp as any;
    const platform = wa.platform as string | undefined;
    if (platform && platform !== 'unknown') return true;
    if (wa.initDataUnsafe?.user?.id) return true;
    if (typeof wa.colorScheme === 'string' && wa.colorScheme !== 'light') return true;
    if (wa.themeParams && typeof wa.themeParams === 'object' && Object.keys(wa.themeParams).length > 0) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getPlatform(): string {
  try {
    return ((WebApp as any).platform as string) || 'unknown';
  } catch {
    return 'unknown';
  }
}

export function getTelegramUser(): TelegramUser | null {
  return unsafe().user ?? null;
}

export function ready(): void {
  try {
    WebApp.ready();
    WebApp.expand();
  } catch {
    // no-op outside Telegram
  }
}

export function setHeaderColor(color: string): void {
  try {
    WebApp.setHeaderColor(color as `#${string}`);
    WebApp.setBackgroundColor(color as `#${string}`);
  } catch {
    // no-op
  }
}

export function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  try {
    (WebApp as any).HapticFeedback?.impactOccurred(style);
  } catch {
    // no-op
  }
}

export function openLink(url: string): void {
  try {
    WebApp.openLink(url);
  } catch {
    window.open(url, '_blank');
  }
}

/**
 * Open Telegram's native share dialog with prefilled URL and text.
 * Works inside WebApp via tg:// share, falls back to a plain t.me link.
 */
export function shareUrl(url: string, text?: string): void {
  const params = new URLSearchParams({ url });
  if (text) params.set('text', text);
  const shareUrl = `https://t.me/share/url?${params.toString()}`;
  try {
    WebApp.openTelegramLink(shareUrl);
  } catch {
    openLink(shareUrl);
  }
}

export function close(): void {
  try {
    WebApp.close();
  } catch {
    // no-op
  }
}
