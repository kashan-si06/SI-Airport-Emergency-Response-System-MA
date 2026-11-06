/**
 * Generates ENS notification tones as 16-bit PCM WAV (iOS critical-alert and
 * Android channel compatible; each < 30 s as Apple requires).
 *
 *   node tools/generate-alert-tones.mjs
 *
 * Distinct sounds per severity (PRD MOB-PUSH-04); drill uses a soft chime so
 * an exercise can never be mistaken for a live alarm.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');
mkdirSync(out, { recursive: true });

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

/** Tone with odd harmonics (clarinet-like, cuts through noise) and click-free edges. */
function tone(freqAt, seconds, { gain = 0.7, harmonics = [1, 0.35, 0.18], fade = 0.012 } = {}) {
  const n = Math.round(seconds * RATE);
  const outBuf = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    phase += (2 * Math.PI * freqAt(t)) / RATE;
    let v = 0;
    harmonics.forEach((a, k) => (v += a * Math.sin(phase * (2 * k + 1))));
    const edge = Math.min(1, t / fade, (seconds - t) / fade);
    outBuf[i] = v * gain * edge / harmonics.reduce((s, a) => s + a, 0);
  }
  return outBuf;
}

function chime(freq, seconds, gain = 0.5) {
  const n = Math.round(seconds * RATE);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.005) * Math.exp(-t * 4.5);
    b[i] = gain * env * (Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.sin(2 * Math.PI * freq * 2 * t));
  }
  return b;
}

const silence = (s) => new Float32Array(Math.round(s * RATE));
const concat = (...parts) => {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const r = new Float32Array(total);
  let o = 0;
  for (const p of parts) {
    r.set(p, o);
    o += p.length;
  }
  return r;
};
const mix = (a, b) => a.map((v, i) => v + (b[i] ?? 0));

// CRITICAL — hi-lo two-tone (960 / 770 Hz), 7 cycles ≈ 4.9 s.
const critical = concat(
  ...Array.from({ length: 7 }, () => concat(tone(() => 960, 0.35), tone(() => 770, 0.35))),
);

// HIGH — four rising sweeps 650→1250 Hz.
const high = concat(
  ...Array.from({ length: 4 }, () => concat(tone((t) => 650 + 1000 * t, 0.6, { gain: 0.6 }), silence(0.15))),
);

// DRILL — soft two-note chime, repeated twice. Deliberately gentle.
const drill = concat(chime(660, 0.6, 0.4), chime(880, 0.9, 0.4), silence(0.3), chime(660, 0.6, 0.4), chime(880, 0.9, 0.4));

// INFO — single short chime for updates and broadcasts.
const info = mix(chime(1046, 0.7, 0.35), chime(1318, 0.7, 0.2));

for (const [name, s] of Object.entries({ ens_critical: critical, ens_high: high, ens_drill: drill, ens_info: info })) {
  writeFileSync(join(out, `${name}.wav`), wav(s));
  console.log(`${name}.wav  ${(s.length / RATE).toFixed(2)} s`);
}
