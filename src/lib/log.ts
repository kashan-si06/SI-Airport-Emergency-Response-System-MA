/**
 * Local diagnostic log. Nothing leaves the device unless the user explicitly
 * attaches it to "Report a problem" (PRD §7.11, MOB-SEC-06). Phone numbers,
 * e-mail addresses and tokens are scrubbed before entries are stored.
 */

type Level = 'info' | 'warn' | 'error';
export type LogEntry = { at: string; level: Level; event: string; data?: unknown };

const MAX = 300;
const buffer: LogEntry[] = [];

const scrubbers: [RegExp, string][] = [
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '<email>'],
  [/\+?\d[\d\s-]{8,}\d/g, '<phone>'],
  [/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1<token>'],
  [/("?(?:access|refresh)Token"?\s*:\s*")[^"]+/gi, '$1<token>'],
];

function scrub(value: unknown): unknown {
  if (value == null) return value;
  let s: string;
  try {
    s = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return '[unserialisable]';
  }
  for (const [re, rep] of scrubbers) s = s.replace(re, rep);
  return s.length > 2000 ? `${s.slice(0, 2000)}…` : s;
}

function push(level: Level, event: string, data?: unknown) {
  buffer.push({ at: new Date().toISOString(), level, event, data: scrub(data) });
  if (buffer.length > MAX) buffer.shift();
  if (__DEV__) {
    const fn = level === 'error' ? console.warn : console.log;
    fn(`[ens] ${event}`, data ?? '');
  }
}

export const log = {
  info: (event: string, data?: unknown) => push('info', event, data),
  warn: (event: string, data?: unknown) => push('warn', event, data),
  error: (event: string, data?: unknown) => push('error', event, data),
  snapshot: (): LogEntry[] => buffer.slice(),
};
