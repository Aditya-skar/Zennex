/**
 * Generates Play Store / App Store icon + splash assets from public/logo.png
 * Usage: node scripts/generate-store-icons.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const logoPath = path.join(root, 'public', 'logo.png');
const outDir = path.join(root, 'resources');

if (!fs.existsSync(logoPath)) {
  console.error('Missing public/logo.png');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join(outDir, 'android'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'ios'), { recursive: true });

const BG = { r: 11, g: 16, b: 32, alpha: 1 }; // #0B1020

async function squareIcon(size, dest, { pad = 0.12 } = {}) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(logoPath)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(dest);
}

async function splash(w, h, dest) {
  const logoSize = Math.round(Math.min(w, h) * 0.28);
  const logo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: { width: w, height: h, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(dest);
}

const androidMipmap = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
];

async function writeAndroidMipmaps() {
  const resRoot = path.join(root, 'android', 'app', 'src', 'main', 'res');
  for (const [folder, size] of androidMipmap) {
    const dir = path.join(resRoot, folder);
    fs.mkdirSync(dir, { recursive: true });
    await squareIcon(size, path.join(dir, 'ic_launcher.png'));
    await squareIcon(size, path.join(dir, 'ic_launcher_round.png'));
    await squareIcon(size, path.join(dir, 'ic_launcher_foreground.png'), { pad: 0.18 });
  }
  // Play Store listing icon
  await squareIcon(512, path.join(outDir, 'android', 'play-store-icon-512.png'), { pad: 0.08 });
  await squareIcon(512, path.join(outDir, 'icon.png'), { pad: 0.08 });
}

async function writeIosIcons() {
  const appIconDir = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
  fs.mkdirSync(appIconDir, { recursive: true });
  // Single 1024 marketing icon (Xcode / Capacitor modern set)
  await squareIcon(1024, path.join(appIconDir, 'AppIcon-512@2x.png'), { pad: 0.06 });
  await squareIcon(1024, path.join(outDir, 'ios', 'AppStore-1024.png'), { pad: 0.06 });

  const contents = {
    images: [
      {
        filename: 'AppIcon-512@2x.png',
        idiom: 'universal',
        platform: 'ios',
        size: '1024x1024',
      },
    ],
    info: { author: 'simsor', version: 1 },
  };
  fs.writeFileSync(path.join(appIconDir, 'Contents.json'), JSON.stringify(contents, null, 2));
}

async function writeSplashes() {
  await splash(2732, 2732, path.join(outDir, 'splash.png'));
  const splashDir = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
  fs.mkdirSync(splashDir, { recursive: true });
  for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    await splash(2732, 2732, path.join(splashDir, name));
  }

  const androidSplashSizes = [
    ['drawable-port-mdpi', 320, 480],
    ['drawable-port-hdpi', 480, 800],
    ['drawable-port-xhdpi', 720, 1280],
    ['drawable-port-xxhdpi', 1080, 1920],
    ['drawable-port-xxxhdpi', 1440, 2560],
    ['drawable-land-mdpi', 480, 320],
    ['drawable-land-hdpi', 800, 480],
    ['drawable-land-xhdpi', 1280, 720],
    ['drawable-land-xxhdpi', 1920, 1080],
    ['drawable-land-xxxhdpi', 2560, 1440],
    ['drawable', 480, 320],
  ];
  const resRoot = path.join(root, 'android', 'app', 'src', 'main', 'res');
  for (const [folder, w, h] of androidSplashSizes) {
    const dir = path.join(resRoot, folder);
    fs.mkdirSync(dir, { recursive: true });
    await splash(w, h, path.join(dir, 'splash.png'));
  }
}

await writeAndroidMipmaps();
await writeIosIcons();
await writeSplashes();
console.log('Store icons + splash generated in resources/, android/, ios/');
