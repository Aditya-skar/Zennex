import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICON_DIR = path.resolve(__dirname, '../public/icons/3d');

const TARGETS = [
  'hiking',
  'volleyball',
  'pilates',
  'weightlifting',
  'calisthenics',
  'yoga',
  'gym',
  'music',
  'screening',
  'clubbing',
  'cosplaying',
];

const SIZE = 256;
const PAD = 10;

/** True for white / grey checkerboard pixels baked into AI exports. Never strip colored subject pixels. */
function isBackgroundPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;

  // Keep anything with noticeable color (subject)
  if (sat > 0.06) return false;

  // Pure white
  if (r > 245 && g > 245 && b > 245) return true;

  // Light grey checkerboard tiles only
  if (max > 180 && sat < 0.04) return true;

  return false;
}

/** Strip baked checkerboard / white box, leaving only the subject alpha. */
async function stripBackground(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isBackgroundPixel(r, g, b)) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png();
}

/**
 * Process AI icon → proper map pin asset:
 * 1. Remove baked background
 * 2. Trim to subject bounds
 * 3. Scale to fit (contain — never crop the subject)
 * 4. Center on square canvas with even padding
 */
async function normalize(name) {
  const file = path.join(ICON_DIR, `${name}.png`);
  if (!fs.existsSync(file)) {
    console.warn(`skip ${name}: missing`);
    return;
  }

  const inner = SIZE - PAD * 2;
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

  const stripped = await stripBackground(file);

  const fitted = await stripped
    .trim()
    .resize(inner, inner, {
      fit: 'contain',
      background: transparent,
    })
    .png()
    .toBuffer();

  const meta = await sharp(fitted).metadata();
  const top = Math.round((SIZE - meta.height) / 2);
  const bottom = SIZE - meta.height - top;
  const left = Math.round((SIZE - meta.width) / 2);
  const right = SIZE - meta.width - left;

  await sharp(fitted)
    .extend({ top, bottom, left, right, background: transparent })
    .png()
    .toFile(file);

  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  let transparentPx = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 20) transparentPx++;
  }
  const pct = ((100 * transparentPx) / (info.width * info.height)).toFixed(1);
  console.log(`fixed ${name}.png -> ${SIZE}x${SIZE} (${pct}% transparent)`);
}

for (const name of TARGETS) {
  try {
    await normalize(name);
  } catch (err) {
    console.warn(`skip ${name}: ${err.message}`);
  }
}
