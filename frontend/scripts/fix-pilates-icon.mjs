/**
 * Fixes pilates icon: transparent / low-alpha holes show as black spots on map pins.
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pngPath = path.resolve(__dirname, '../public/icons/3d/pilates.png');

const { data, info } = await sharp(pngPath).raw().ensureAlpha().toBuffer({
  resolveWithObject: true,
});

const { width: w, height: h } = info;
const pixels = new Uint8Array(data);

function idx(x, y) {
  return (y * w + x) * 4;
}

function isSubject(a) {
  return a >= 12;
}

function neighborColor(x, y, minAlpha = 200) {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const i = idx(nx, ny);
      const a = pixels[i + 3];
      if (a < minAlpha) continue;
      const pr = pixels[i];
      const pg = pixels[i + 1];
      const pb = pixels[i + 2];
      if (pr < 30 && pg < 30 && pb < 30) continue;
      r += pr;
      g += pg;
      b += pb;
      count++;
    }
  }

  if (!count) return null;
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

let minX = w;
let minY = h;
let maxX = 0;
let maxY = 0;

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (isSubject(pixels[idx(x, y) + 3])) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
}

const cx = (minX + maxX) / 2;
const ballTop = minY;
const ballBottom = minY + (maxY - minY) * 0.58;
const ballRx = (maxX - minX) * 0.44;
const ballRy = (ballBottom - ballTop) * 0.54;
const ballCy = ballTop + ballRy;

function inBall(x, y, scale = 1) {
  const dx = (x - cx) / (ballRx * scale);
  const dy = (y - ballCy) / (ballRy * scale);
  return dx * dx + dy * dy <= 1;
}

let br = 0;
let bg = 0;
let bb = 0;
let ballCount = 0;

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (!inBall(x, y, 0.92)) continue;
    const i = idx(x, y);
    if (pixels[i + 3] < 180) continue;
    br += pixels[i];
    bg += pixels[i + 1];
    bb += pixels[i + 2];
    ballCount++;
  }
}

const ballFill = {
  r: Math.round(br / ballCount),
  g: Math.round(bg / ballCount),
  b: Math.round(bb / ballCount),
};

let fixed = 0;

for (let pass = 0; pass < 20; pass++) {
  const next = new Uint8Array(pixels);
  let passFixed = 0;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = idx(x, y);
      const a = pixels[i + 3];
      const insideBall = inBall(x, y, 0.88);
      const needsAlphaFix = insideBall && a < 250;
      const isHole = a < 20;
      const isDarkSpeck =
        insideBall &&
        a >= 20 &&
        pixels[i] < 40 &&
        pixels[i + 1] < 40 &&
        pixels[i + 2] < 40;

      if (!needsAlphaFix && !isHole && !isDarkSpeck) continue;

      const color = neighborColor(x, y) ?? (insideBall ? ballFill : null);
      if (!color) continue;

      next[i] = color.r;
      next[i + 1] = color.g;
      next[i + 2] = color.b;
      next[i + 3] = 255;
      passFixed++;
    }
  }

  pixels.set(next);
  fixed += passFixed;
  if (passFixed === 0) break;
}

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = idx(x, y);
    if (pixels[i + 3] > 10) pixels[i + 3] = 255;
  }
}

await sharp(pixels, { raw: { width: w, height: h, channels: 4 } }).png().toFile(pngPath);

console.log(`Fixed ${pngPath} (${fixed} pixels, ball fill rgb=${ballFill.r},${ballFill.g},${ballFill.b})`);
