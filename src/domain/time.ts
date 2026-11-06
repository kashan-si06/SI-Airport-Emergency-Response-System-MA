/**
 * All timestamps arrive as UTC ISO strings and are displayed in IST
 * (PRD §5.10). The device clock is corrected by the server offset so
 * elapsed timers agree with the AOCC console.
 */

const IST = 'Asia/Kolkata';

let serverOffsetMs = 0;

/** Called whenever the API returns a server timestamp. */
export function syncServerTime(serverIso: string) {
  const server = Date.parse(serverIso);
  if (!Number.isNaN(server)) serverOffsetMs = server - Date.now();
}

export function now(): number {
  return Date.now() + serverOffsetMs;
}

const timeFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST,
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const secondsFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return timeFmt.format(new Date(iso));
}

export function formatTimeSeconds(iso: string | null | undefined): string {
  if (!iso) return '—';
  return secondsFmt.format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return dateTimeFmt.format(new Date(iso));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return dateFmt.format(new Date(iso));
}

/** "04:12" / "1:02:45" — operational elapsed clock. */
export function formatElapsed(fromIso: string, toMs: number = now()): string {
  const total = Math.max(0, Math.floor((toMs - Date.parse(fromIso)) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "just now", "4 min ago", "2 h ago", "12 Oct" */
export function formatRelative(iso: string, ref: number = now()): string {
  const diff = Math.floor((ref - Date.parse(iso)) / 1000);
  if (diff < 45) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return formatDate(iso);
}

export function durationBetween(fromIso: string, toIso: string): string {
  const s = Math.max(0, Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}
