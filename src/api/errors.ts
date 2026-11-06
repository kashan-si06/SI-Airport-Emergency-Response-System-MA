export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'validation'
  | 'upgradeRequired'
  | 'rateLimited'
  | 'server'
  | 'invalidResponse';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string | null;
  readonly details: unknown;

  constructor(kind: ApiErrorKind, message: string, opts: { status?: number | null; code?: string | null; details?: unknown } = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = opts.status ?? null;
    this.code = opts.code ?? null;
    this.details = opts.details;
  }

  /** Worth retrying later from the offline outbox. */
  get transient(): boolean {
    return this.kind === 'network' || this.kind === 'timeout' || this.kind === 'server' || this.kind === 'rateLimited';
  }
}

export function kindForStatus(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 422) return 'validation';
  if (status === 426) return 'upgradeRequired';
  if (status === 429) return 'rateLimited';
  return 'server';
}
