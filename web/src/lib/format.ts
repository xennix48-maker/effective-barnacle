/**
 * Format a number as MMK with thousands separators and 2 decimal places.
 * Rounds display; underlying values use NUMERIC(18,8) precision server-side.
 */
export function formatMMK(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '0.00';
  const fixed = n.toFixed(2);
  const [whole, frac] = fixed.split('.');
  const withSep = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${withSep}.${frac}`;
}

export function formatMMKShort(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '0';
  const v = Math.round(n);
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Seconds → "X days Y hours Z minutes" */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** ISO timestamp → "2026-08-23 14:30" (server-relative, no TZ conversion). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (x: number) => x.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
