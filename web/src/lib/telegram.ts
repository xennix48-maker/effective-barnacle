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

export function close(): void {
  try {
    WebApp.close();
  } catch {
    // no-op
  }
}
