import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'public/badges/ranks-sprite.png');
const outDir = path.join(root, 'public/badges/ranks');

const ids = [
  'ground-zero',
  'drifter',
  'skywalker',
  'firestreak',
  'edgewalker',
  'voidrunner',
  'orbiter',
  'zenith',
];

const meta = await sharp(src).metadata();
const cols = 4;
const rows = 2;
const cellW = Math.floor(meta.width / cols);
const cellH = Math.floor(meta.height / rows);

await mkdir(outDir, { recursive: true });

for (let i = 0; i < ids.length; i += 1) {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const left = col * cellW;
  const top = row * cellH;

  await sharp(src)
    .extract({ left, top, width: cellW, height: cellH })
    .png()
    .toFile(path.join(outDir, `${ids[i]}.png`));

  console.log(`Wrote ${ids[i]}.png (${cellW}x${cellH})`);
}
