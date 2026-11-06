import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';

import { log } from '@/lib/log';
import type { LocalAttachment } from '@/offline/outbox';

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_EDGE = 1920;

export type CaptureResult =
  | { ok: true; attachment: LocalAttachment }
  | { ok: false; reason: 'cancelled' | 'permission' | 'error'; message?: string };

/** EXIF "2026:11:03 14:02:11" (device local time) → ISO. */
function exifToIso(exif: Record<string, unknown> | null | undefined): string | null {
  const raw = (exif?.DateTimeOriginal ?? exif?.DateTime) as string | undefined;
  if (!raw) return null;
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(raw);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function sizeOf(uri: string): Promise<number> {
  try {
    return (await (await fetch(uri)).blob()).size;
  } catch {
    return 0;
  }
}

/**
 * Captures evidence for checklists and field reports (MOB-CHK-02, FR-CHK-04):
 * re-encoded to JPEG ≤ 2 MB. Re-encoding drops all EXIF, including GPS; the
 * capture time is preserved separately as `takenAt`.
 */
export async function capturePhoto(source: 'camera' | 'library' = 'camera'): Promise<CaptureResult> {
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.getCameraPermissionsAsync();
      if (!perm.granted) {
        if (!perm.canAskAgain) return { ok: false, reason: 'permission' };
        const req = await ImagePicker.requestCameraPermissionsAsync();
        if (!req.granted) return { ok: false, reason: 'permission' };
      }
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85, exif: true };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets[0]) return { ok: false, reason: 'cancelled' };
    const asset = res.assets[0];
    const takenAt = exifToIso(asset.exif) ?? new Date().toISOString();

    const ctx = ImageManipulator.manipulate(asset.uri);
    if (Math.max(asset.width, asset.height) > MAX_EDGE) {
      ctx.resize(asset.width >= asset.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
    }
    const rendered = await ctx.renderAsync();
    let out = await rendered.saveAsync({ compress: 0.72, format: SaveFormat.JPEG });
    let size = await sizeOf(out.uri);
    if (size > MAX_BYTES) {
      out = await rendered.saveAsync({ compress: 0.5, format: SaveFormat.JPEG });
      size = await sizeOf(out.uri);
    }
    return { ok: true, attachment: { localUri: out.uri, mime: 'image/jpeg', size, takenAt } };
  } catch (e) {
    log.error('media.capture', e instanceof Error ? e.message : e);
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : undefined };
  }
}

export function openCameraSettings() {
  return Linking.openSettings();
}
