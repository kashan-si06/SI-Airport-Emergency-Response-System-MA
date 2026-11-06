import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import type { z } from 'zod';

import { accessTokenIsFresh, clearTokens, loadTokens, saveTokens } from '@/auth/tokens';
import { env } from '@/config/env';
import { syncServerTime } from '@/domain/time';
import { log } from '@/lib/log';
import { installationId } from '@/lib/installation';

import { ApiError, kindForStatus } from './errors';
import { ApiErrorBody, TokenPair } from './schemas';

const DEFAULT_TIMEOUT_MS = 15_000;

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type RequestOptions<S extends z.ZodTypeAny | undefined> = {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  schema?: S;
  /** Mutations carry an idempotency key so retries from the outbox never double-apply. */
  idempotencyKey?: string;
  auth?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
};

type Listeners = {
  onSessionExpired?: () => void;
  onUpgradeRequired?: (minVersion: string | null) => void;
};

const listeners: Listeners = {};

export function setClientListeners(l: Listeners) {
  Object.assign(listeners, l);
}

export const appVersion = Application.nativeApplicationVersion ?? '0.0.0';

function buildUrl(path: string, query?: RequestOptions<undefined>['query']): string {
  const base = env().apiBaseUrl.replace(/\/$/, '');
  const url = new URL(base + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export function newIdempotencyKey(): string {
  return Crypto.randomUUID();
}

/* ───────────── token refresh (single-flight) ───────────── */

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const pair = await rawRequest('/mobile/v1/auth/refresh', {
          method: 'POST',
          body: { refreshToken },
          schema: TokenPair,
          auth: false,
        });
        await saveTokens(pair);
        return pair.accessToken;
      } catch (e) {
        if (e instanceof ApiError && (e.kind === 'unauthorized' || e.kind === 'forbidden')) {
          await clearTokens();
          listeners.onSessionExpired?.();
          return null;
        }
        throw e;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

async function currentAccessToken(): Promise<string | null> {
  const t = await loadTokens();
  if (!t) return null;
  if (accessTokenIsFresh(t)) return t.accessToken;
  return refreshAccessToken(t.refreshToken);
}

/* ───────────── core request ───────────── */

async function rawRequest<S extends z.ZodTypeAny | undefined>(
  path: string,
  opts: RequestOptions<S>,
  accessToken?: string | null,
): Promise<S extends z.ZodTypeAny ? z.infer<S> : void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  opts.signal?.addEventListener('abort', () => controller.abort());

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-ENS-Client': `mobile/${Platform.OS}`,
    'X-ENS-App-Version': appVersion,
    // Lets the server bind this session to this phone, so revoking the phone really signs it out.
    'X-ENS-Installation': installationId(),
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = controller.signal.aborted && !opts.signal?.aborted;
    throw new ApiError(aborted ? 'timeout' : 'network', aborted ? 'Request timed out' : 'Network request failed', {
      details: e instanceof Error ? e.message : e,
    });
  } finally {
    clearTimeout(timeout);
  }

  const serverDate = res.headers.get('X-ENS-Server-Time');
  if (serverDate) syncServerTime(serverDate);

  const text = await res.text();
  const json: unknown = text ? safeJson(text) : undefined;

  if (!res.ok) {
    const parsed = ApiErrorBody.safeParse(json);
    const kind = kindForStatus(res.status);
    const err = new ApiError(kind, parsed.success ? parsed.data.error.message : `Request failed (${res.status})`, {
      status: res.status,
      code: parsed.success ? parsed.data.error.code : null,
      details: parsed.success ? parsed.data.error.details : json,
    });
    if (kind === 'upgradeRequired') {
      const min = (parsed.success && (parsed.data.error.details as { minVersion?: string } | undefined)?.minVersion) || null;
      listeners.onUpgradeRequired?.(min);
    }
    throw err;
  }

  if (!opts.schema) return undefined as never;
  const result = opts.schema.safeParse(json);
  if (!result.success) {
    log.error('api.invalidResponse', { path, issues: result.error.issues.slice(0, 5) });
    throw new ApiError('invalidResponse', 'The server sent data this app version cannot read.', {
      status: res.status,
      details: result.error.issues,
    });
  }
  return result.data as never;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Authenticated request. On 401 the access token is refreshed once and the
 * request replayed; a second 401 ends the session.
 */
export async function request<S extends z.ZodTypeAny | undefined = undefined>(
  path: string,
  opts: RequestOptions<S> = {},
): Promise<S extends z.ZodTypeAny ? z.infer<S> : void> {
  if (opts.auth === false) return rawRequest(path, opts);

  const token = await currentAccessToken();
  if (!token) {
    listeners.onSessionExpired?.();
    throw new ApiError('unauthorized', 'Signed out');
  }
  try {
    return await rawRequest(path, opts, token);
  } catch (e) {
    if (e instanceof ApiError && e.kind === 'unauthorized') {
      const t = await loadTokens();
      if (!t) throw e;
      const fresh = await refreshAccessToken(t.refreshToken);
      if (!fresh) throw e;
      return rawRequest(path, opts, fresh);
    }
    throw e;
  }
}

/** Upload a local file to a pre-signed URL (PRD §11.1 POST /attachments). */
export async function uploadBinary(
  url: string,
  fileUri: string,
  mime: string,
  method: 'PUT' | 'POST',
  extraHeaders: Record<string, string>,
): Promise<void> {
  const blob = await (await fetch(fileUri)).blob();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': mime, ...extraHeaders },
      body: blob,
      signal: controller.signal,
    });
    if (!res.ok) throw new ApiError(kindForStatus(res.status), `Upload failed (${res.status})`, { status: res.status });
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(controller.signal.aborted ? 'timeout' : 'network', 'Upload failed — will retry');
  } finally {
    clearTimeout(timeout);
  }
}
