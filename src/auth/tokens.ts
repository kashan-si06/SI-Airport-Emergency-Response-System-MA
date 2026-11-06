import type { TokenPair } from '@/api/schemas';
import { deleteSecret, getSecret, setSecret } from '@/lib/keystore';

const KEY = 'ens.tokens.v1';

type Stored = { accessToken: string; refreshToken: string; expiresAt: number };

let cache: Stored | null = null;

export async function loadTokens(): Promise<Stored | null> {
  if (cache) return cache;
  const raw = await getSecret(KEY);
  if (!raw) return null;
  try {
    cache = JSON.parse(raw) as Stored;
    return cache;
  } catch {
    await deleteSecret(KEY);
    return null;
  }
}

export async function saveTokens(pair: TokenPair): Promise<void> {
  cache = {
    accessToken: pair.accessToken,
    refreshToken: pair.refreshToken,
    // Refresh 30 s early to absorb clock skew and request latency.
    expiresAt: Date.now() + (pair.expiresIn - 30) * 1000,
  };
  await setSecret(KEY, JSON.stringify(cache));
}

export async function clearTokens(): Promise<void> {
  cache = null;
  await deleteSecret(KEY);
}

export function accessTokenIsFresh(t: Stored): boolean {
  return Date.now() < t.expiresAt;
}
