/**
 * Volleyball PNG has transparent "panel" cutouts that read as black stripes
 * on the dark map pin. Fill them with white so panels stay white in light mode.
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pngPath = path.resolve(__dirname, '../public/icons/3d/volleyball.png');

const { data, info } = await sharp(pngPath).raw().ensureAlpha().toBuffer({
  resolveWithObject: true,
});

const { width: w, height: h } = info;

let minX = w;
let minY = h;
let maxX = 0;
let maxY = 0;

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (data[i + 3] > 20) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
}

const cx = (minX + maxX) / 2;
const cy = (minY + maxY) / 2;
const r = (Math.min(maxX - minX, maxY - minY) / 2) * 0.96;

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy > r * r) continue;

    const i = (y * w + x) * 4;
    if (data[i + 3] >= 20) continue;

    const shade = 0.9 + 0.1 * (1 - (dy + r) / (2 * r));
    const v = Math.round(255 * shade);
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
}

await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toFile(pngPath);

console.log('Wrote', pngPath);
