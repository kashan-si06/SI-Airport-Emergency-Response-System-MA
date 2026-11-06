import * as Crypto from 'expo-crypto';

import { prefs } from './storage';

const INSTALL_KEY = 'ens.installationId';

/** Stable per-install identifier; survives sign-out, reset on reinstall. */
export function installationId(): string {
  let id = prefs.getString(INSTALL_KEY);
  if (!id) {
    id = Crypto.randomUUID();
    prefs.set(INSTALL_KEY, id);
  }
  return id;
}
