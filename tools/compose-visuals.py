"""
Composes the app's photographs and airport map from the sources in tools/visuals/.

    pip install pillow numpy
    python tools/compose-visuals.py

Each photograph gets one shared grade and is closed off by the same curve as
hero-glow.png, so they read as one set and src/ui/rim-light.tsx runs along all of
them. Keep CURVE in step with rim-light.tsx and tools/generate-glows.mjs.
Credits for the sources: assets/images/heroes/CREDITS.md
"""
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / 'tools' / 'visuals'
OUT = ROOT / 'assets' / 'images' / 'heroes'
FONT = ROOT / 'node_modules' / '@expo-google-fonts' / 'hanken-grotesk' / '500Medium' / 'HankenGrotesk_500Medium.ttf'

CANVAS = np.array([15, 16, 18], dtype=float) / 255
RIM_DEEP = np.array([190, 78, 42], dtype=float) / 255
RIM_BRIGHT = np.array([246, 170, 128], dtype=float) / 255

WIDTH = 1080
SHORT = 720

# name: source, output height, horizontal and vertical focus (0-1), zoom, exposure.
PHOTOS = {
    'airfield-night': ('airfield-night.jpg', SHORT, 0.62, 0.5, 1.0, 1.25),
    'crash-tender': ('crash-tender.jpg', SHORT, 0.56, 0.52, 1.0, 0.72),
    'radio': ('radio.jpg', SHORT, 0.8, 0.3, 1.1, 0.72),
    'terminal': ('terminal.jpg', SHORT, 0.72, 0.42, 1.0, 0.72),
    'approach': ('approach.jpg', SHORT, 0.5, 0.42, 1.25, 1.0),
    'marshaller': ('marshaller.jpg', SHORT, 0.5, 0.45, 1.0, 0.72),
}


def smoothstep(a, b, v):
    t = np.clip((v - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def curve(u):
    turn = 0.62
    return np.where(u > turn, 0.86 - 0.11 * ((u - turn) / (1 - turn)) ** 2, 0.86 - 0.02 * ((turn - u) / turn) ** 2)


def crop(path, height, fx, fy, zoom):
    im = Image.open(path).convert('RGB')
    scale = max(WIDTH / im.width, height / im.height) * zoom
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    left = round(min(max(im.width * fx - WIDTH / 2, 0), im.width - WIDTH))
    top = round(min(max(im.height * fy - height / 2, 0), im.height - height))
    return im.crop((left, top, left + WIDTH, top + height))


def compose(name, source, height, fx, fy, zoom, exposure):
    rgb = np.asarray(crop(SOURCES / source, height, fx, fy, zoom), dtype=float) / 255
    v, u = np.mgrid[0:height, 0:WIDTH]
    u = (u + 0.5) / WIDTH
    v = (v + 0.5) / height

    # One grade across the set: less saturated, deeper, warmer.
    luma = (rgb * [0.2126, 0.7152, 0.0722]).sum(axis=2, keepdims=True)
    rgb = luma + (rgb - luma) * 0.74
    rgb = np.clip(rgb, 0, 1) ** 1.2 * exposure * np.array([1.04, 0.96, 0.86])

    # Quieter where words sit: down the left, and under the status bar.
    keep = 0.4 + 0.6 * smoothstep(0.05, 0.62, u)
    keep = keep * (0.5 + 0.5 * smoothstep(0.0, 0.26, v))

    # Sinks into the canvas before the curve: further on the left, where no bright rim closes it off.
    edge = curve(u)
    slope = (curve(u + 0.001) - edge) / 0.001
    above = (edge - v) * height / np.hypot(1, slope * height / WIDTH)
    reach = (210 + 200 * (1 - smoothstep(0.5, 0.9, u))) * height / SHORT
    keep = keep * smoothstep(0, reach, above)
    keep = keep[..., None]
    out = CANVAS + (rgb - CANVAS) * keep

    # The faint trace of the curve the moving light runs along.
    line = (np.clip(1.8 - np.abs(above), 0, 1) * 0.3)[..., None]
    tint = RIM_DEEP + (RIM_BRIGHT - RIM_DEEP) * smoothstep(0.6, 1, u)[..., None]
    out = out + (tint - out) * line

    # Grain ties the sources together and stops the dark ramps banding.
    rng = np.random.default_rng(7)
    grain = rng.normal(0, 1.4 / 255, out.shape[:2])[..., None]
    out = out + grain * (above > 2)[..., None]
    out = np.where((above < -2)[..., None], CANVAS, out)

    image = Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype('uint8'))
    path = OUT / f'{name}.webp'
    image.save(path, quality=82, method=6)
    print(f'{path.name}  {WIDTH}x{height}  {path.stat().st_size // 1024} KB')


# ---------- Airport map, drawn from OpenStreetMap geometry.
MAP_WIDTH = 1600
SCALE = 2
PAD = 0.012


def build_map():
    elements = json.loads((SOURCES / 'noida-aeroway.json').read_text(encoding='utf-8'))['elements']
    lats = [p['lat'] for e in elements for p in e.get('geometry', [])]
    lngs = [p['lon'] for e in elements for p in e.get('geometry', [])]
    south, north = min(lats) - PAD / 3, max(lats) + PAD / 3
    west, east = min(lngs) - PAD / 2, max(lngs) + PAD / 2
    aspect = (east - west) * math.cos(math.radians((north + south) / 2)) / (north - south)
    width, height = MAP_WIDTH * SCALE, round(MAP_WIDTH / aspect) * SCALE

    def xy(p):
        return ((p['lon'] - west) / (east - west) * width, (north - p['lat']) / (north - south) * height)

    image = Image.new('RGB', (width, height), (15, 16, 18))
    draw = ImageDraw.Draw(image)
    by = lambda kind: [e for e in elements if e.get('tags', {}).get('aeroway') == kind]

    for e in by('aerodrome'):
        points = [xy(p) for p in e['geometry']]
        draw.polygon(points, fill=(23, 24, 27))
        draw.line(points + points[:1], fill=(74, 76, 82), width=2 * SCALE)
    for kind, fill in (('apron', (64, 66, 71)), ('terminal', (190, 104, 66))):
        for e in by(kind):
            draw.polygon([xy(p) for p in e['geometry']], fill=fill)
    for e in by('taxiway'):
        draw.line([xy(p) for p in e['geometry']], fill=(138, 141, 147), width=6 * SCALE, joint='curve')
    for e in by('stopway'):
        draw.line([xy(p) for p in e['geometry']], fill=(92, 94, 100), width=22 * SCALE)
    runway = by('runway')[0]
    points = [xy(p) for p in runway['geometry']]
    draw.line(points, fill=(176, 178, 183), width=24 * SCALE, joint='curve')

    # Dashed centre line, walked along the runway.
    remaining, drawing = 34.0 * SCALE, True
    for a, b in zip(points, points[1:]):
        length = math.dist(a, b)
        done = 0.0
        while done < length:
            step = min(remaining, length - done)
            if drawing:
                s = (a[0] + (b[0] - a[0]) * done / length, a[1] + (b[1] - a[1]) * done / length)
                t = (a[0] + (b[0] - a[0]) * (done + step) / length, a[1] + (b[1] - a[1]) * (done + step) / length)
                draw.line([s, t], fill=(15, 16, 18), width=3 * SCALE)
            done += step
            remaining -= step
            if remaining <= 0:
                drawing = not drawing
                remaining = (34.0 if drawing else 26.0) * SCALE

    font = ImageFont.truetype(str(FONT), 26 * SCALE)
    label = (166, 170, 175)
    west_end, east_end = sorted((points[0], points[-1]))
    draw.text((west_end[0] - 18 * SCALE, west_end[1]), '10', font=font, fill=(232, 233, 235), anchor='rm')
    draw.text((east_end[0] + 18 * SCALE, east_end[1]), '28', font=font, fill=(232, 233, 235), anchor='lm')
    for e in by('terminal'):
        xs, ys = zip(*[xy(p) for p in e['geometry']])
        draw.text((sum(xs) / len(xs), max(ys) + 14 * SCALE), 'Terminal 1', font=font, fill=label, anchor='ma')

    image = image.resize((width // SCALE, height // SCALE), Image.LANCZOS)
    path = OUT / 'airport-map.webp'
    image.save(path, quality=86, method=6)
    print(f'{path.name}  {image.width}x{image.height}  {path.stat().st_size // 1024} KB')
    print(f'MAP_BOUNDS = north {north:.6f} south {south:.6f} west {west:.6f} east {east:.6f}  aspect {image.width / image.height:.4f}')


def alert_field():
    """Laid over any severity colour: clear above the curve with a soft fall-off, canvas below it."""
    height = 840
    v, u = np.mgrid[0:height, 0:WIDTH]
    u = (u + 0.5) / WIDTH
    v = (v + 0.5) / height
    edge = curve(u)
    slope = (curve(u + 0.001) - edge) / 0.001
    above = (edge - v) * height / np.hypot(1, slope * height / WIDTH)

    shade = 0.2 * smoothstep(0.3, 1, v / edge) * (1 - 0.6 * smoothstep(0.3, 1, u)) + 0.06 * (1 - smoothstep(0, 0.3, v))
    inside = np.clip(0.5 - above, 0, 1)
    rgb = CANVAS[None, None, :] * inside[..., None]
    alpha = shade + (1 - shade) * inside

    # The faint trace of the curve the moving light runs along.
    line = np.clip(1.8 - np.abs(above), 0, 1) * 0.3
    tint = RIM_DEEP + (RIM_BRIGHT - RIM_DEEP) * smoothstep(0.6, 1, u)[..., None]
    rgb = rgb + (tint - rgb) * line[..., None]
    alpha = alpha + (1 - alpha) * line

    pixels = np.dstack([rgb, alpha])
    image = Image.fromarray((np.clip(pixels, 0, 1) * 255 + 0.5).astype('uint8'), 'RGBA')
    path = OUT / 'alert-field.webp'
    image.save(path, lossless=True, method=6)
    print(f'{path.name}  {WIDTH}x{height}  {path.stat().st_size // 1024} KB')


OUT.mkdir(parents=True, exist_ok=True)
for name, spec in PHOTOS.items():
    compose(name, *spec)
build_map()
alert_field()
