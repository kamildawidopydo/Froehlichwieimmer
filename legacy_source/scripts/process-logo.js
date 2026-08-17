/* eslint-disable */
// One-shot utility: convert a solid-dark background PNG logo into a clean
// transparent-background asset, then trim and re-pad. Run via:
//   node scripts/process-logo.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '..', 'public', 'assets', 'logo', 'kapitalmitte-logo.png');

async function run() {
  if (!fs.existsSync(INPUT)) {
    console.error('Input not found:', INPUT);
    process.exit(1);
  }

  const { data, info } = await sharp(INPUT).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  console.log(`Source: ${width}x${height}`);

  // Sample several corner pixels and average — robust against single noisy pixel.
  const samplePoints = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
  ];
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  for (const [x, y] of samplePoints) {
    const idx = (y * width + x) * 4;
    sumR += data[idx];
    sumG += data[idx + 1];
    sumB += data[idx + 2];
  }
  const bgR = Math.round(sumR / samplePoints.length);
  const bgG = Math.round(sumG / samplePoints.length);
  const bgB = Math.round(sumB / samplePoints.length);
  console.log(`Detected background: rgb(${bgR}, ${bgG}, ${bgB})`);

  // Color-distance threshold. Logo navy #092142 = rgb(9,33,66) — distance from
  // pure black is sqrt(9^2+33^2+66^2) ≈ 74, so threshold 35 is safely below.
  const HARD = 35;
  const SOFT = 70;

  const out = Buffer.from(data);
  let cleared = 0;
  for (let i = 0; i < out.length; i += 4) {
    const dr = out[i] - bgR;
    const dg = out[i + 1] - bgG;
    const db = out[i + 2] - bgB;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist <= HARD) {
      out[i + 3] = 0;
      cleared++;
    } else if (dist < SOFT) {
      const t = (dist - HARD) / (SOFT - HARD);
      out[i + 3] = Math.round(out[i + 3] * t);
    }
  }
  const total = out.length / 4;
  console.log(`Pixels cleared to transparent: ${cleared}/${total} (${((cleared / total) * 100).toFixed(1)}%)`);

  const tmp = INPUT + '.tmp.png';
  await sharp(out, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 1 })
    .extend({
      top: 80,
      bottom: 80,
      left: 80,
      right: 80,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(tmp);

  const { width: ow, height: oh } = await sharp(tmp).metadata();
  fs.renameSync(tmp, INPUT);
  console.log(`Output: ${ow}x${oh} → ${INPUT}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
