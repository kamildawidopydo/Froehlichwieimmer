/**
 * Builds looping H.264 MP4 Reels from AI poster PNGs + procedural motion overlays.
 * Requires: npm install ffmpeg-static (devDependency)
 * Source: assets/ig-reel-*.png → public/assets/social/instagram/reels/*.mp4
 * Run: npm run social:instagram-reels
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const sharp = require('sharp');

let ffmpegPath;
try {
  ffmpegPath = require('ffmpeg-static');
} catch {
  ffmpegPath = null;
}

const stagingCandidates = [
  path.join(process.env.USERPROFILE || '', '.cursor/projects/c-Users-HP-Desktop-IT-dataweb/assets'),
  path.join(__dirname, '../assets'),
];
const staging = stagingCandidates.find((p) => fs.existsSync(p));
const outDir = path.join(__dirname, '../public/assets/social/instagram/reels');

const REELS = [
  { src: 'ig-reel-sparvergleich.png', id: 'reel-sparvergleich', accent: '#E8C547' },
  { src: 'ig-reel-zinsen.png', id: 'reel-zinsen', accent: '#2DD4BF' },
  { src: 'ig-reel-sicherheit.png', id: 'reel-sicherheit', accent: '#60A5FA' },
];

const W = 720;
const H = 1280;
const FPS = 30;
const SECONDS = 4;
const FRAMES = FPS * SECONDS;

const particleOverlay = (frame, accent) => {
  const t = (frame / FRAMES) * Math.PI * 2;
  const sweep = ((frame / FRAMES) * 1.4 - 0.2) * W;
  let dots = '';
  for (let p = 0; p < 14; p++) {
    const a = t + p * 0.45;
    const cx = W / 2 + Math.sin(a) * (W * 0.32 + (p % 4) * 18);
    const cy = H * 0.45 + Math.cos(a * 0.85) * (H * 0.28 + p * 6);
    const r = 3 + (p % 4) * 2.5;
    const op = 0.12 + 0.38 * ((Math.sin(a * 2.2 + t) + 1) / 2);
    dots += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${accent}" opacity="${op.toFixed(2)}"/>`;
  }
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <linearGradient id="sw" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#fff" stop-opacity="0"/>
          <stop offset="50%" stop-color="#fff" stop-opacity="0.14"/>
          <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${dots}
      <rect x="${(sweep - 140).toFixed(0)}" y="0" width="280" height="${H}" fill="url(#sw)" transform="skewX(-8)"/>
    </svg>`,
  );
};

async function motionFrame(input, frame, accent) {
  const t = frame / FRAMES;
  const loop = Math.sin(t * Math.PI * 2);
  const scale = 1.12 + 0.08 * Math.sin(t * Math.PI * 2);
  const sw = Math.round(W * scale);
  const sh = Math.round(H * scale);
  const maxL = sw - W;
  const maxT = sh - H;
  const left = Math.round(maxL * (0.2 + 0.5 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2))));
  const top = Math.round(maxT * (0.15 + 0.45 * (0.5 + 0.5 * Math.cos(t * Math.PI * 2 * 0.7))));

  const base = await sharp(input)
    .rotate()
    .resize(sw, sh, { fit: 'cover', position: 'centre' })
    .extract({
      left: Math.max(0, Math.min(left, maxL)),
      top: Math.max(0, Math.min(top, maxT)),
      width: W,
      height: H,
    })
    .modulate({
      brightness: 1 + 0.06 * loop,
      saturation: 1 + 0.08 * Math.sin(t * Math.PI * 4),
    })
    .toBuffer();

  return sharp(base)
    .composite([{ input: particleOverlay(frame, accent), blend: 'screen' }])
    .jpeg({ quality: 88 })
    .toBuffer();
}

function encodeMp4(framesDir, outPath) {
  if (!ffmpegPath) throw new Error('ffmpeg-static not installed. Run: npm install ffmpeg-static --save-dev');

  const args = [
    '-y',
    '-framerate',
    String(FPS),
    '-i',
    path.join(framesDir, 'frame_%04d.jpg'),
    '-c:v',
    'libx264',
    '-profile:v',
    'main',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-crf',
    '23',
    '-preset',
    'medium',
    outPath,
  ];

  const r = spawnSync(ffmpegPath, args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg failed (${r.status})`);
}

async function renderReel(srcPath, id, accent) {
  const posterPath = path.join(outDir, `${id}.png`);
  const mp4Path = path.join(outDir, `${id}.mp4`);
  const framesDir = path.join(outDir, `_frames_${id}`);

  await sharp(srcPath)
    .rotate()
    .resize(540, 960, { fit: 'cover', position: 'centre' })
    .png({ quality: 88 })
    .toFile(posterPath);

  fs.mkdirSync(framesDir, { recursive: true });
  const existing = fs.readdirSync(framesDir);
  existing.forEach((f) => fs.unlinkSync(path.join(framesDir, f)));

  for (let i = 0; i < FRAMES; i++) {
    const buf = await motionFrame(srcPath, i, accent);
    fs.writeFileSync(path.join(framesDir, `frame_${String(i + 1).padStart(4, '0')}.jpg`), buf);
    if (i % 30 === 0) process.stdout.write(`  ${id}: ${i + 1}/${FRAMES}\r`);
  }

  encodeMp4(framesDir, mp4Path);
  fs.rmSync(framesDir, { recursive: true, force: true });

  const mb = (fs.statSync(mp4Path).size / 1024 / 1024).toFixed(2);
  console.log(`OK ${id}.mp4 (${SECONDS}s, ${mb} MB)`);
}

async function main() {
  if (!staging) {
    console.error('Staging folder not found');
    process.exit(1);
  }
  if (!ffmpegPath) {
    console.error('ffmpeg-static missing');
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  for (const { src, id, accent } of REELS) {
    const srcPath = path.join(staging, src);
    if (!fs.existsSync(srcPath)) {
      console.warn('Missing:', src);
      continue;
    }
    await renderReel(srcPath, id, accent);
  }

  console.log('Done →', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
