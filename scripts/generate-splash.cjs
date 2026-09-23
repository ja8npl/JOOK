'use strict';
/*
 * Splash-Generator für iOS (apple-touch-startup-image).
 *
 * Erzeugt die Splash-PNGs pixelidentisch zur Launch-Animation in der App:
 *   - Hintergrund exakt --bg-base (#1F2024, theme-unabhängig wie die App-Icons)
 *   - dunkle Kachel (#09090B) mit Radius 22 % der Kantenlänge
 *   - Dumbbell-Glyph von lucide (identisch zum App-Icon), Lime #CAFE00,
 *     Strichstärke 2/24 des Icon-Grids, runde Kappen — wie <Dumbbell /> in der App
 *
 * Warum selbst rendern? Ohne passendes apple-touch-startup-image zeigt iOS auf
 * Geräten ohne exakte Medien-Query einen grauen Fallback-Splash mit generischem
 * Icon. Der Generator deckt alle aktuellen iPhone-Größen ab.
 *
 * Ausführen: node scripts/generate-splash.cjs
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── Marken-Konstanten (müssen mit src/components/SplashIntro.tsx übereinstimmen) ──
const BG = [31, 32, 36];        // #1F2024 — --bg-base
const TILE = [9, 9, 11];        // #09090B — Icon-Kachel
const GLYPH = [202, 254, 0];    // #CAFE00 — Icon-Lime
const TILE_RATIO = 0.293;       // Kachel-Seitenlänge / Bildschirmbreite
const TILE_RADIUS_RATIO = 0.22; // Eckenradius / Kachelseitenlänge
const GLYPH_RATIO = 0.545;      // Glyph-Box / Kachelseitenlänge (Icon-Verhältnis 24:44)

// ── Dumbbell-Glyph: exakte Pfade aus lucide-react v1.46.0 (ViewBox 24×24) ──
const GLYPH_PATHS = [
  'M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z',
  'm2.5 21.5 1.4-1.4',
  'm20.1 3.9 1.4-1.4',
  'M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z',
  'm9.6 14.4 4.8-4.8',
];

// ── Mini-SVG-Path-Parser: M m L l H h V v A a Z z → Polylinien ──
const NUM_RE = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;

function tokenize(d) {
  const tokens = [];
  const re = /([MmLlHhVvAaZz])|([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)/g;
  let m;
  while ((m = re.exec(d)) !== null) {
    if (m[1]) tokens.push(m[1]);
    else tokens.push(parseFloat(m[2]));
  }
  return tokens;
}

function flattenPath(d, segments) {
  const tokens = tokenize(d);
  let i = 0;
  let cmd = '';
  let cx = 0, cy = 0;      // aktueller Punkt
  let sx = 0, sy = 0;      // Startpunkt des Subpaths
  let px = 0, py = 0;      // vorheriger Punkt für relative Konvertierung

  const nextNum = () => tokens[i++];

  function line(x1, y1, x2, y2) {
    segments.push([x1, y1, x2, y2]);
  }

  function arc(x1, y1, rx, ry, phiDeg, laf, sf, x2, y2) {
    if (rx === 0 || ry === 0) { line(x1, y1, x2, y2); return; }
    const phi = (phiDeg * Math.PI) / 180;
    const cosP = Math.cos(phi), sinP = Math.sin(phi);
    const dx2 = (x1 - x2) / 2, dy2 = (y1 - y2) / 2;
    const x1p = cosP * dx2 + sinP * dy2;
    const y1p = -sinP * dx2 + cosP * dy2;
    rx = Math.abs(rx); ry = Math.abs(ry);
    const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lambda > 1) {
      const s = Math.sqrt(lambda);
      rx *= s; ry *= s;
    }
    const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
    const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    let co = Math.sqrt(Math.max(0, num / (den || 1e-12)));
    if (laf === sf) co = -co;
    const cxp = (co * rx * y1p) / ry;
    const cyp = (-co * ry * x1p) / rx;
    const ccx = cosP * cxp - sinP * cyp + (x1 + x2) / 2;
    const ccy = sinP * cxp + cosP * cyp + (y1 + y2) / 2;
    const t1 = Math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx);
    const t2 = Math.atan2((-y1p - cyp) / ry, (-x1p - cxp) / rx);
    let dT = t2 - t1;
    if (!sf && dT > 0) dT -= 2 * Math.PI;
    if (sf && dT < 0) dT += 2 * Math.PI;
    const n = Math.max(2, Math.ceil(Math.abs(dT) / (Math.PI / 12)));
    let prevX = x1, prevY = y1;
    for (let k = 1; k <= n; k++) {
      const t = t1 + (dT * k) / n;
      const x = ccx + rx * Math.cos(t) * cosP - ry * Math.sin(t) * sinP;
      const y = ccy + rx * Math.cos(t) * sinP + ry * Math.sin(t) * cosP;
      line(prevX, prevY, x, y);
      prevX = x; prevY = y;
    }
  }

  while (i < tokens.length) {
    if (typeof tokens[i] === 'string') { cmd = tokens[i++]; }
    switch (cmd) {
      case 'M': case 'm': {
        const x = nextNum(), y = nextNum();
        cx = cmd === 'M' ? x : cx + x;
        cy = cmd === 'M' ? y : cy + y;
        sx = cx; sy = cy; px = cx; py = cy;
        cmd = cmd === 'M' ? 'L' : 'l';
        break;
      }
      case 'L': case 'l': {
        do {
          const x = nextNum(), y = nextNum();
          const ax = cmd === 'L' ? x : cx + x;
          const ay = cmd === 'L' ? y : cy + y;
          line(cx, cy, ax, ay);
          cx = ax; cy = ay;
        } while (i < tokens.length && typeof tokens[i] === 'number');
        px = cx; py = cy;
        break;
      }
      case 'H': case 'h': {
        do {
          const x = nextNum();
          const ax = cmd === 'H' ? x : cx + x;
          line(cx, cy, ax, cy);
          cx = ax;
        } while (i < tokens.length && typeof tokens[i] === 'number');
        px = cx; py = cy;
        break;
      }
      case 'V': case 'v': {
        do {
          const y = nextNum();
          const ay = cmd === 'V' ? y : cy + y;
          line(cx, cy, cx, ay);
          cy = ay;
        } while (i < tokens.length && typeof tokens[i] === 'number');
        px = cx; py = cy;
        break;
      }
      case 'A': case 'a': {
        do {
          const rx = nextNum(), ry = nextNum(), rot = nextNum();
          const laf = nextNum(), sf = nextNum();
          const x = nextNum(), y = nextNum();
          const ax = cmd === 'A' ? x : cx + x;
          const ay = cmd === 'A' ? y : cy + y;
          arc(cx, cy, rx, ry, rot, laf, sf, ax, ay);
          cx = ax; cy = ay;
        } while (i < tokens.length && typeof tokens[i] === 'number');
        px = cx; py = cy;
        break;
      }
      case 'Z': case 'z': {
        if (cx !== sx || cy !== sy) line(cx, cy, sx, sy);
        cx = sx; cy = sy;
        break;
      }
      default:
        i++; // unbekannter Befehl: überspringen
    }
  }
}

// Glyph-Segmente einmalig im 24er-Grid flachen
const GLYPH_SEGMENTS = [];
for (const d of GLYPH_PATHS) flattenPath(d, GLYPH_SEGMENTS);

// ── Rasterizer ──
function renderSplash(w, h) {
  const rgb = Buffer.alloc(w * h * 3);
  // Grund: Hintergrundfarbe
  for (let i = 0; i < w * h; i++) {
    rgb[i * 3] = BG[0]; rgb[i * 3 + 1] = BG[1]; rgb[i * 3 + 2] = BG[2];
  }

  const cx = w / 2, cy = h / 2;
  const tileSide = Math.round(w * TILE_RATIO);
  const half = tileSide / 2;
  const radius = tileSide * TILE_RADIUS_RATIO;

  // Kachel (antialiasted Rounded-Rect via SDF), nur im Bounding-Bereich
  const tMinX = Math.max(0, Math.floor(cx - half - 2));
  const tMaxX = Math.min(w - 1, Math.ceil(cx + half + 2));
  const tMinY = Math.max(0, Math.floor(cy - half - 2));
  const tMaxY = Math.min(h - 1, Math.ceil(cy + half + 2));
  for (let y = tMinY; y <= tMaxY; y++) {
    for (let x = tMinX; x <= tMaxX; x++) {
      const qx = Math.abs(x + 0.5 - cx) - (half - radius);
      const qy = Math.abs(y + 0.5 - cy) - (half - radius);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
      const d = Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - radius;
      const cov = Math.min(1, Math.max(0, 0.5 - d));
      if (cov <= 0) continue;
      const idx = (y * w + x) * 3;
      rgb[idx] = Math.round(BG[0] + (TILE[0] - BG[0]) * cov);
      rgb[idx + 1] = Math.round(BG[1] + (TILE[1] - BG[1]) * cov);
      rgb[idx + 2] = Math.round(BG[2] + (TILE[2] - BG[2]) * cov);
    }
  }

  // Glyph-Strokes skalieren: 24er-Grid → Kachel
  const s = (tileSide * GLYPH_RATIO) / 24;
  const segs = GLYPH_SEGMENTS.map(([x1, y1, x2, y2]) => [
    (x1 - 12) * s + cx, (y1 - 12) * s + cy,
    (x2 - 12) * s + cx, (y2 - 12) * s + cy,
  ]);

  let gMinX = Infinity, gMaxX = -Infinity, gMinY = Infinity, gMaxY = -Infinity;
  for (const [x1, y1, x2, y2] of segs) {
    gMinX = Math.min(gMinX, x1, x2); gMaxX = Math.max(gMaxX, x1, x2);
    gMinY = Math.min(gMinY, y1, y2); gMaxY = Math.max(gMaxY, y1, y2);
  }
  const strokeHalf = s; // Strichstärke 2 im 24er-Grid → 2*s/2 = s
  const pad = Math.ceil(strokeHalf + 2);
  const gpx0 = Math.max(0, Math.floor(gMinX - pad));
  const gpx1 = Math.min(w - 1, Math.ceil(gMaxX + pad));
  const gpy0 = Math.max(0, Math.floor(gMinY - pad));
  const gpy1 = Math.min(h - 1, Math.ceil(gMaxY + pad));

  for (let y = gpy0; y <= gpy1; y++) {
    for (let x = gpx0; x <= gpx1; x++) {
      const ppx = x + 0.5, ppy = y + 0.5;
      let minD = Infinity;
      for (let k = 0; k < segs.length; k++) {
        const [x1, y1, x2, y2] = segs[k];
        const ex = x2 - x1, ey = y2 - y1;
        const lenSq = ex * ex + ey * ey;
        let t = 0;
        if (lenSq > 0) t = ((ppx - x1) * ex + (ppy - y1) * ey) / lenSq;
        const tc = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = ppx - (x1 + ex * tc), dy = ppy - (y1 + ey * tc);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minD) minD = d;
      }
      const cov = Math.min(1, Math.max(0, 0.5 + (strokeHalf - minD)));
      if (cov <= 0) continue;
      const idx = (y * w + x) * 3;
      const inv = 1 - cov;
      rgb[idx] = Math.round(rgb[idx] * inv + GLYPH[0] * cov);
      rgb[idx + 1] = Math.round(rgb[idx + 1] * inv + GLYPH[1] * cov);
      rgb[idx + 2] = Math.round(rgb[idx + 2] * inv + GLYPH[2] * cov);
    }
  }
  return rgb;
}

// ── PNG-Encoder (RGB, Filter Up, zlib Level 9) ──
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(w, h, rgb) {
  const stride = w * 3;
  const bytesPerRow = 1 + stride;
  const raw = Buffer.alloc(bytesPerRow * h);
  for (let y = 0; y < h; y++) {
    const off = y * bytesPerRow;
    if (y === 0) {
      raw[off] = 0;
      rgb.slice(0, stride).copy(raw, off + 1);
    } else {
      raw[off] = 2; // Filter Up — komprimiert Flächen ideal
      const row = rgb.slice(y * stride, (y + 1) * stride);
      const prev = rgb.slice((y - 1) * stride, y * stride);
      for (let i = 0; i < stride; i++) raw[off + 1 + i] = (row[i] - prev[i]) & 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // Bit-Tiefe
  ihdr[9] = 2;  // Color-Type RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Alle iPhone-Größen (physische Pixel, Portrait) ──
const SIZES = [
  { w: 1179, h: 2556 }, // 14/15/16 (393×852 @3x)
  { w: 1206, h: 2622 }, // 16 Pro / 17 (402×874 @3x)
  { w: 1290, h: 2796 }, // 15/16 Pro Max (430×932 @3x)
  { w: 1320, h: 2868 }, // 16/17 Pro Max (440×956 @3x)
  { w: 1260, h: 2736 }, // iPhone Air (420×912 @3x)
  { w: 1284, h: 2778 }, // 12/13 Pro Max, 14 Plus (428×926 @3x)
  { w: 1170, h: 2532 }, // 13/14 (390×844 @3x)
  { w: 1125, h: 2436 }, // X/XS/11 Pro, 12/13 mini (375×812 @3x)
  { w: 750, h: 1334 },  // SE (375×667 @2x)
];

const outDir = path.join(__dirname, '..', 'public');
for (const { w, h } of SIZES) {
  const file = path.join(outDir, `splash-${w}x${h}.png`);
  const rgb = renderSplash(w, h);
  const png = encodePNG(w, h, rgb);
  fs.writeFileSync(file, png);
  console.log(`✓ splash-${w}x${h}.png (${(png.length / 1024).toFixed(0)} KB)`);
}
