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
 * Reliable "are we running inside Telegram at all" signal. Telegram's web-app
 * script populates `WebApp.platform` (e.g. 'ios', 'android', 'tdesktop', 'web')
 * even when initData is missing — that happens when the URL is opened via a
 * plain chat link rather than a `web_app` button. Use this to distinguish
 * "open in Telegram" from "in Telegram, but please reopen via bot menu".
 */
export function isInsideTelegram(): boolean {
  try {
    const platform = (WebApp as any).platform as string | undefined;
    return Boolean(platform) && platform !== 'unknown';
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
