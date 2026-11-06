/**
 * Generates the app's glows as PNGs, so they need no gradient dependency and look
 * identical on every platform.
 *
 *   node tools/generate-glows.mjs
 *
 * Below the curve the image is exactly CANVAS (the dark palette's `canvas` in
 * src/theme/tokens.ts) so it dissolves into the screen with no visible edge.
 * Keep the two in step.
 */
import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const WIDTH = 1080;
const HEIGHT = 1300;
const CANVAS = [15, 16, 18];

/** Soft pools of colour, added over the canvas. Coordinates are 0–1 of the image. */
const POOLS = [
  { x: 1.06, y: 0.32, rx: 0.5, ry: 0.27, color: [106, 48, 30] },
  { x: 0.84, y: 0.62, rx: 0.3, ry: 0.13, color: [44, 38, 14] },
  { x: 0.56, y: 0.07, rx: 0.34, ry: 0.15, color: [34, 11, 11] },
  { x: 0.14, y: -0.03, rx: 0.24, ry: 0.1, color: [9, 6, 12] },
];

const RIM_BRIGHT = [246, 170, 128];
const RIM_DEEP = [190, 78, 42];
const RIM_WIDTH = 2.6;
/** The line is only a faint trace here: src/ui/rim-light.tsx runs the bright light along it. */
const RIM_RESTING = 0.3;

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a.map((c, i) => c + (b[i] - c) * t);

/** Lower edge of the glow: nearly flat from the left edge, then sweeping up to the right edge. Keep in step with rim-light.tsx. */
function curve(u) {
  const turn = 0.62;
  return u > turn ? 0.86 - 0.11 * ((u - turn) / (1 - turn)) ** 2 : 0.86 - 0.02 * ((turn - u) / turn) ** 2;
}

function pixel(u, v) {
  const edge = curve(u);
  const slope = (curve(u + 0.001) - edge) / 0.001;
  // Distance above the curve in pixels, measured across the line rather than straight down.
  const above = ((edge - v) * HEIGHT) / Math.hypot(1, (slope * HEIGHT) / WIDTH);

  const inside = clamp(above + 0.5);
  if (inside <= 0 && above < -RIM_WIDTH) return { rgb: CANVAS, flat: true };

  let rgb = CANVAS;
  if (inside > 0) {
    const glow = [0, 0, 0];
    for (const p of POOLS) {
      const d = ((u - p.x) / p.rx) ** 2 + ((v - p.y) / p.ry) ** 2;
      const k = Math.exp(-d);
      for (let i = 0; i < 3; i += 1) glow[i] += p.color[i] * k;
    }
    // The glow sinks away before the curve, fully so on the left, where no rim line closes it off.
    const settle = smoothstep(0, 90 + 330 * (1 - smoothstep(0.5, 0.9, u)), above);
    rgb = CANVAS.map((c, i) => c + glow[i] * inside * settle);
  }

  // The rim is a hairline across the full width, warming and brightening toward the right edge.
  const line = clamp(RIM_WIDTH / 2 + 0.5 - Math.abs(above)) * RIM_RESTING;
  const halo = Math.exp(-Math.max(above, 0) / 26) * 0.2 * inside * smoothstep(0.52, 0.92, u);
  const tint = mix(RIM_DEEP, RIM_BRIGHT, smoothstep(0.6, 1, u));
  rgb = mix(rgb, tint, clamp(line + halo));
  return { rgb, flat: false };
}

/** Small seeded generator: the output stays byte-identical between runs. */
let seed = 0x2f6e2b1;
function random() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 0xffffffff;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encode(width, height, shade) {
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    raw[row] = 0; // PNG filter: none.
    for (let x = 0; x < width; x += 1) {
      const { rgb, flat } = shade((x + 0.5) / width, (y + 0.5) / height);
      // Dither the glow so these dark, slow ramps never show bands. The flat canvas stays exact.
      const noise = flat ? 0 : random() - random();
      for (let i = 0; i < 3; i += 1) {
        raw[row + 1 + x * 3 + i] = clamp(Math.round(rgb[i] + noise * 0.75), 0, 255);
      }
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * The quieter glow behind every other screen. No curve, and it reaches exactly
 * CANVAS at the top, left and bottom, so an opaque header above it leaves no seam.
 */
const AMBIENT_POOLS = [
  { x: 1.04, y: 0.3, rx: 0.56, ry: 0.26, color: [62, 28, 18] },
  { x: 0.78, y: 0.52, rx: 0.3, ry: 0.12, color: [18, 15, 6] },
];

function ambient(u, v) {
  const fade = smoothstep(0, 0.22, v) * (1 - smoothstep(0.62, 0.98, v));
  if (fade <= 0) return { rgb: CANVAS, flat: true };
  const glow = [0, 0, 0];
  for (const p of AMBIENT_POOLS) {
    const k = Math.exp(-(((u - p.x) / p.rx) ** 2 + ((v - p.y) / p.ry) ** 2));
    for (let i = 0; i < 3; i += 1) glow[i] += p.color[i] * k;
  }
  if (glow[0] * fade < 0.5) return { rgb: CANVAS, flat: true };
  return { rgb: CANVAS.map((c, i) => c + glow[i] * fade), flat: false };
}

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'images');
mkdirSync(out, { recursive: true });
for (const [name, width, height, shade] of [
  ['hero-glow.png', WIDTH, HEIGHT, pixel],
  ['ambient-glow.png', 540, 600, ambient],
]) {
  const png = encode(width, height, shade);
  writeFileSync(join(out, name), png);
  console.log(`${name}  ${width}x${height}  ${(png.length / 1024).toFixed(0)} KB`);
}
