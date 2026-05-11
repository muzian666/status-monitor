const TZ_OFFSET = 8; // UTC+8

/**
 * Format a UTC datetime string to local display string (UTC+8).
 */
export function formatTime(utcStr: string | null | undefined): string {
  if (!utcStr) return '-';
  const d = new Date(utcStr);
  if (isNaN(d.getTime())) return utcStr;
  const local = new Date(d.getTime() + TZ_OFFSET * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())} ${pad(local.getHours())}:${pad(local.getMinutes())}:${pad(local.getSeconds())}`;
}

/**
 * Format for chart X axis (shorter: HH:mm:ss).
 */
export function formatTimeShort(utcStr: string | null | undefined): string {
  if (!utcStr) return '';
  const d = new Date(utcStr);
  if (isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() + TZ_OFFSET * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(local.getHours())}:${pad(local.getMinutes())}:${pad(local.getSeconds())}`;
}

/**
 * Relative time: "3 seconds ago", "2 minutes ago", etc.
 */
export function timeAgo(utcStr: string | null | undefined): string {
  if (!utcStr) return '';
  const d = new Date(utcStr);
  if (isNaN(d.getTime())) return '';
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
