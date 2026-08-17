/**
 * Generate rebrand marketing images via OpenAI Images (gpt-image-1 / DALL·E 3).
 *
 * Requires OPENAI_API_KEY in environment or .env
 *
 * Usage:
 *   node scripts/generate-rebrand-marketing-images.mjs
 *   node scripts/generate-rebrand-marketing-images.mjs --force
 *   node scripts/generate-rebrand-marketing-images.mjs --force hero-banking home-cta-growth
 *   OPENAI_IMAGE_MODEL=dall-e-3 node scripts/generate-rebrand-marketing-images.mjs --force
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/**
 * Raisin visual DNA (Bright8 TVC / 2025 brand):
 * people-first, warm everyday cinema, peace-of-mind — not corporate stock.
 */
const STYLE =
  'Raisin / WeltSparen brand photography: warm intimate European lifestyle cinema for a savings platform. ' +
  'People-first peace-of-mind mood — everyday life in the foreground, money only implied. ' +
  'Soft natural window light, gentle warm color grade, real skin texture with pores, candid documentary framing, ' +
  'shot like 35mm editorial / Bright8 Raisin TVC feel. Northern European homes and cities. ' +
  'Brand palette echoes only as accents: deep blue base with soft green and coral-orange in clothes or objects. ' +
  'HARD AVOID: stiff corporate headshots, crossed-arms power poses, fake stock smiles into camera, plastic AI skin, ' +
  'matching beige family outfits walking toward lens, generic glass-office bokeh portraits, over-smoothed faces, ' +
  'readable UI text, logos, watermarks, cartoons.';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

/** @type {{ id: string, dest: string, w: number, h: number, prompt: string, quality?: number, icon?: boolean }[]} */
const MANIFEST = [
  {
    id: 'hero-banking',
    dest: 'public/assets/hero-banking.png',
    w: 1200,
    h: 900,
    prompt:
      'Candid Raisin TVC kitchen moment: mid-30s Northern European couple at a lived-in oak kitchen island, she leans in reading a paper statement while he scrolls a phone with a soft half-smile, half-eaten breakfast and coffee cups still on the table, warm morning side light from a real window, imperfect home details, they look at each other not the camera',
  },
  {
    id: 'hero-family-planning',
    dest: 'public/assets/hero-family-planning.png',
    w: 1200,
    h: 1600,
    // Homepage hero — family on sofa with realistic tablet (no UI overlays in photo)
    prompt:
      'Vertical 3:4. Happy European family of three on beige sofa: mother blonde beige sweater, daughter holding realistic silver tablet with dark reflective glass (no readable UI), father light blue shirt. Soft daylight living room, warm smiles looking at tablet not camera. No text, no cards, no logo',
  },
  {
    id: 'home-cta-growth',
    dest: 'public/assets/marketing/home-cta-growth.png',
    w: 1200,
    h: 900,
    prompt:
      'Raisin growth-with-clarity still life, NO people/faces/hands: bright modern European office window overlooking soft-focus glass-and-steel financial district, pale oak desk with slim navy portfolio and neat white documents with cobalt binder clips, quiet emerald-green folder tab accent (#059669), soft daylight cool-neutral grade, airy left negative space for text overlay, editorial fintech calm — no fake UI, no logos, no purple gradients',
  },
  {
    id: 'home-cta-bonus',
    dest: 'public/assets/marketing/home-cta-bonus.png',
    w: 1200,
    h: 800,
    prompt:
      'Warm Raisin team moment: three colleagues around a pale wood table in a bright Berlin fintech loft, one pointing at a printed chart while others lean in listening, casual smart clothes with navy and soft green accents, natural laughter mid-conversation, real daylight, candid angles, nobody looking at camera',
  },
  {
    id: 'about-hero',
    dest: 'public/assets/marketing/about-hero.png',
    w: 1600,
    h: 900,
    prompt:
      'Frankfurt Bankenviertel on a clear morning: glass towers with soft blue reflections, a few distant pedestrians at street level for scale, warm-cool mixed light, premium European financial district editorial, cinematic wide crop, lived-in city not empty CGI plaza',
  },
  {
    id: 'about-partner',
    dest: 'public/assets/marketing/about-partner.png',
    w: 1400,
    h: 900,
    prompt:
      'Raisin partnership conversation: German advisor and Dutch partner sitting side by side at eye level in a bright Amsterdam meeting room, sharing one notebook between them, genuine listening expressions, soft daylight, navy and sand wardrobe, candid mid-discussion, not a handshake stock cliché',
  },
  {
    id: 'about-leistung',
    dest: 'public/assets/marketing/about-leistung.png',
    w: 1400,
    h: 900,
    prompt:
      'Raisin service craft: two specialists reviewing color-coded product folders at a clean white desk, focused but relaxed body language, soft afternoon light, one person explaining with a pen while the other nods, European fintech office with plants, candid documentary crop',
  },
  {
    id: 'about-arbeitsweise',
    dest: 'public/assets/marketing/about-arbeitsweise.png',
    w: 1400,
    h: 900,
    prompt:
      'Transparent Raisin working style: small team annotating printed charts with sticky notes on a glass wall, soft daylight loft office, natural concentration faces, messy-but-honest process, no staged smiles into camera',
  },
  {
    id: 'about-standort',
    dest: 'public/assets/marketing/about-standort.png',
    w: 1400,
    h: 900,
    prompt:
      'Frankfurt am Main skyline from the river at soft blue hour with warm window lights starting to glow, a cyclist and a pedestrian on the embankment for life, cinematic European financial hub, quiet confident mood',
  },
  {
    id: 'security-hero',
    dest: 'public/assets/marketing/security-hero.png',
    w: 1600,
    h: 900,
    prompt:
      'Calm institutional security: modern European data hall corridor with cool blue ambient light and neat cable trays, one technician in the far distance for scale, trustworthy infrastructure mood, no cyberpunk neon',
  },
  {
    id: 'security-editorial',
    dest: 'public/assets/marketing/security-editorial.png',
    w: 1400,
    h: 900,
    prompt:
      'Close editorial of a brushed-metal bank vault door with warm side light and soft shadows, protection and deposit guarantee mood, tactile metal texture, no people needed',
  },
  {
    id: 'how-it-works-hero',
    dest: 'public/assets/marketing/how-it-works-hero.png',
    w: 1600,
    h: 900,
    prompt:
      'Raisin onboarding calm: young professional woman at a bright oak desk sorting a few offer sheets with a pen, soft focus coffee mug, relaxed posture, natural morning light, she looks at papers not camera',
  },
  {
    id: 'how-it-works-step-1',
    dest: 'public/assets/marketing/how-it-works-step-1.png',
    w: 1200,
    h: 800,
    prompt:
      'Comparing savings offers: person in a soft green sweater comparing two printed bank sheets side by side on a desk, thoughtful tilt of head, warm desk lamp plus window light, candid top-three-quarter angle',
  },
  {
    id: 'how-it-works-step-2',
    dest: 'public/assets/marketing/how-it-works-step-2.png',
    w: 1200,
    h: 800,
    prompt:
      'Personal Raisin advice moment: advisor and client across a small table in a bright café-like meeting nook, listening faces, open notebook, navy and coral accents, warm natural light, genuine conversation not sales pose',
  },
  {
    id: 'how-it-works-step-3',
    dest: 'public/assets/marketing/how-it-works-step-3.png',
    w: 1200,
    h: 800,
    prompt:
      'Secure digital onboarding: hands of a mid-30s person signing on a tablet at a clean European desk, ID folder closed beside them, soft daylight, honest close crop, calm process mood',
  },
  {
    id: 'how-it-works-step-4',
    dest: 'public/assets/marketing/how-it-works-step-4.png',
    w: 1200,
    h: 800,
    prompt:
      'Quiet relief after account opening: person holding an opened confirmation letter by a sunny apartment window, soft half-smile looking outside, lived-in home interior, Raisin peace-of-mind ending',
  },
  {
    id: 'savings-education-hero',
    dest: 'public/assets/marketing/savings-education-hero.png',
    w: 1400,
    h: 900,
    prompt:
      'Savings education mood: person with reading glasses reviewing a labeled navy folder at a bright oak desk, calculator nearby, soft morning light, focused but unstressed expression, documentary still',
  },
  {
    id: 'savings-education-1',
    dest: 'public/assets/marketing/savings-education-1.png',
    w: 1400,
    h: 900,
    prompt:
      'Raisin kitchen money talk: couple at a European kitchen table with statements spread out, one resting chin thoughtfully while the other holds a page, soft daylight, real kitchen clutter in background, intimate and unstaged, not looking at camera',
  },
  {
    id: 'savings-education-2',
    dest: 'public/assets/marketing/savings-education-2.png',
    w: 1400,
    h: 900,
    prompt:
      'Interest planning close-up: person in a navy knit sweater using a calculator beside an open notebook on a wooden desk, small house model in soft background blur, warm directional daylight, candid hands and torso crop, lived-in desk not fake prop set',
  },
  {
    id: 'kredit-hero',
    dest: 'public/assets/kredit-hero.png',
    w: 1200,
    h: 900,
    prompt:
      'Home financing hope: young European couple stepping into a bright empty apartment, keys in hand, looking at each other with quiet excitement, soft daylight through bare windows, authentic moving-day energy',
  },
  {
    id: 'comparison-hero',
    dest: 'public/assets/marketing/comparison-hero.png',
    w: 1600,
    h: 900,
    prompt:
      'Cross-border savings concept: person leaning over a large paper map of Europe on a desk with a few small pins, thoughtful profile in soft window light, editorial flat lay hybrid, Raisin EU marketplace mood',
  },
  {
    id: 'spezial-aif-hero',
    dest: 'public/assets/marketing/spezial-aif-hero.png',
    w: 1600,
    h: 900,
    prompt:
      'Long-term wealth horizon: mature couple on a coastal terrace looking out at calm sea at golden hour, quiet contentment, teak chairs and linen clothes, soft warm cinema light, backs partly turned to camera',
  },
  {
    id: 'spezial-aif-strategy',
    dest: 'public/assets/marketing/spezial-aif-strategy.png',
    w: 1600,
    h: 900,
    prompt:
      'Due diligence focus without corporate cliché: bearded man mid-40s in navy suit jacket without tie, leaning over reports near a window, soft natural light, thoughtful concentration looking down at papers, European office with green trees outside, calm institutional quality — not arms crossed, not staring at camera',
  },
  {
    id: 'spezial-aif-focus',
    dest: 'public/assets/marketing/spezial-aif-focus.png',
    w: 1600,
    h: 700,
    prompt:
      'Modern European glass institutional facade with soft sky reflections, wide cinematic architectural crop, a few tiny pedestrians for scale, premium quiet confidence',
  },
  {
    id: 'spezial-aif-pib-goals',
    dest: 'public/assets/marketing/spezial-aif-pib-goals.png',
    w: 1200,
    h: 800,
    prompt:
      'Raisin multi-generation peace-of-mind: grandparents, parents and two kids walking a sunlit park path in casual mixed clothes (not matching beige sets), candid side angle mid-stride, natural laughter, soft green bokeh, warm documentary light — not a staged walk-toward-camera stock shot',
  },
  {
    id: 'spezial-aif-asset-re',
    dest: 'public/assets/marketing/spezial-aif-asset-re.png',
    w: 900,
    h: 700,
    prompt:
      'Modern European residential courtyard facade at daytime, soft shadows, real-estate investment editorial, a balcony plant and open window for life',
  },
  {
    id: 'spezial-aif-asset-infra',
    dest: 'public/assets/marketing/spezial-aif-asset-infra.png',
    w: 900,
    h: 700,
    prompt: 'Wind turbines on a green coastal ridge at dusk, calm cinematic landscape, long-term infrastructure mood',
  },
  {
    id: 'spezial-aif-asset-debt',
    dest: 'public/assets/marketing/spezial-aif-asset-debt.png',
    w: 900,
    h: 700,
    prompt:
      'Printed bond charts and credit documents on a desk with soft side light, private credit strategy still life, tactile paper texture',
  },
  {
    id: 'spezial-aif-asset-liq',
    dest: 'public/assets/marketing/spezial-aif-asset-liq.png',
    w: 900,
    h: 700,
    prompt: 'Clear mountain lake reflecting soft sky, liquidity and reserves metaphor, serene European alpine landscape',
  },
  {
    id: 'spezial-aif-asset-other',
    dest: 'public/assets/marketing/spezial-aif-asset-other.png',
    w: 900,
    h: 700,
    prompt:
      'Soft architectural light on blue-green glass panels, complementary strategies metaphor, calm premium institutional tone',
  },
  {
    id: 'fg-band-sea',
    dest: 'public/assets/marketing/fg-band-sea.png',
    w: 1800,
    h: 600,
    prompt: 'Aerial of clear deep blue calm ocean water with soft texture, abstract peaceful banner crop',
  },
  {
    id: 'fg-calm-office',
    dest: 'public/assets/marketing/fg-calm-office.png',
    w: 1200,
    h: 800,
    prompt:
      'Bright tidy European loft desk with a person calmly organizing folders, soft daylight, structured but human workspace, Raisin clarity mood',
  },
  {
    id: 'fg-team',
    dest: 'public/assets/marketing/fg-team.png',
    w: 1200,
    h: 800,
    prompt:
      'Small Raisin-like team at a whiteboard workshop, one writing while others listen, natural concentration, soft daylight Berlin office, candid mid-meeting',
  },
  {
    id: 'fg-planning',
    dest: 'public/assets/marketing/fg-planning.png',
    w: 1200,
    h: 800,
    prompt:
      'Financial planning desk scene: person annotating charts in a notebook, top-three-quarter editorial angle, soft daylight, calm analysis mood',
  },
  {
    id: 'fg-philosophy',
    dest: 'public/assets/marketing/fg-philosophy.png',
    w: 1400,
    h: 900,
    prompt:
      'Investment philosophy shared focus: four colleagues leaning over the same open portfolio booklet on a pale oak table, soft window light creating long shapes, quiet concentration looking down together, navy and cream wardrobe, Raisin collaborative clarity — not looking at camera',
  },
  {
    id: 'festgeld-home-card',
    dest: 'public/assets/products/festgeld-home-card.png',
    w: 800,
    h: 800,
    prompt:
      'Long-term security: mature European couple on a Mediterranean terrace overlooking calm sea at golden hour, quiet contentment looking at the horizon, linen clothes, editorial travel still',
  },
  {
    id: 'festgeld-hero',
    dest: 'public/assets/products/festgeld-hero.png',
    w: 1200,
    h: 800,
    prompt:
      'Vintage red Alpine train at a mountain station in soft morning mist, planned journey metaphor for fixed savings, cinematic European travel with a few distant travelers',
  },
  {
    id: 'festgeld-lifestyle',
    dest: 'public/assets/products/festgeld-lifestyle.png',
    w: 1600,
    h: 700,
    prompt:
      'Classic European limestone bank building facade on a quiet street, soft overcast morning, a cyclist passing for life, institutional trust mood',
  },
  {
    id: 'festgeld-cta',
    dest: 'public/assets/products/festgeld-cta.png',
    w: 1000,
    h: 800,
    prompt:
      'Hands carefully placing documents into a safe-deposit drawer, warm ambient light, commitment and trust, close honest crop',
  },
  {
    id: 'flexgeld-home-card',
    dest: 'public/assets/products/flexgeld-home-card.png',
    w: 800,
    h: 800,
    prompt:
      'Contemplative freedom: woman in a linen dress walking a sunlit lavender path in Provence, soft breeze, looking ahead not at camera, no phone, Raisin flexibility mood',
  },
  {
    id: 'flexgeld-hero',
    dest: 'public/assets/products/flexgeld-hero.png',
    w: 1200,
    h: 800,
    prompt:
      'Flexibility across generations: grandfather and young granddaughter cycling slowly in a green European park, candid joy, soft canopy light, natural colors',
  },
  {
    id: 'flexgeld-lifestyle',
    dest: 'public/assets/products/flexgeld-lifestyle.png',
    w: 1600,
    h: 700,
    prompt: 'Misty Scandinavian lake at dawn with wooden dock, still water reflection, muted blues and greens, wide landscape',
  },
  {
    id: 'flexgeld-cta',
    dest: 'public/assets/products/flexgeld-cta.png',
    w: 1000,
    h: 800,
    prompt:
      'Woman sitting on a wooden jetty at a misty Nordic lake holding a mug, calm contemplative profile, soft dawn light, no phone',
  },
  {
    id: 'tagesgeld-home-card',
    dest: 'public/assets/products/tagesgeld-home-card.png',
    w: 800,
    h: 800,
    prompt:
      'Everyday liquidity: German weekly market baker handing a bread bag to a customer in a half-timbered square, candid documentary European life, soft morning light, no price signs',
  },
  {
    id: 'tagesgeld-hero',
    dest: 'public/assets/products/tagesgeld-hero.png',
    w: 1200,
    h: 800,
    prompt:
      'Amsterdam canal houses after rain with soft rainbow light on wet cobblestones, a cyclist in the distance, everyday availability mood',
  },
  {
    id: 'tagesgeld-lifestyle',
    dest: 'public/assets/products/tagesgeld-lifestyle.png',
    w: 1600,
    h: 700,
    prompt:
      'Amsterdam canal row houses in soft morning light with parked bicycles, wide editorial travel photography, lived-in city',
  },
  {
    id: 'tagesgeld-cta',
    dest: 'public/assets/products/tagesgeld-cta.png',
    w: 1000,
    h: 800,
    prompt:
      'Morning routine liquidity: woman unlocking an apartment door with fresh bread and flowers, European street soft light, everyday ease',
  },
  {
    id: 'benefit-beratung',
    dest: 'public/assets/footer/benefits/persoenliche-beratung.png',
    w: 512,
    h: 512,
    icon: true,
    prompt:
      'Minimal flat vector icon of a friendly advisor headset, professional slate-blue and green palette, pure white background, clean fintech UI icon style, centered',
  },
  {
    id: 'benefit-vergleich',
    dest: 'public/assets/footer/benefits/kostenloser-vergleich.png',
    w: 512,
    h: 512,
    icon: true,
    prompt:
      'Minimal flat vector icon of comparison chart bars with a checkmark, slate-blue and green fintech palette, pure white background, clean UI icon',
  },
  {
    id: 'benefit-sicherheit',
    dest: 'public/assets/footer/benefits/tuv-sicherheit.png',
    w: 512,
    h: 512,
    icon: true,
    prompt:
      'Minimal flat vector icon of a shield with lock, secure trust symbol, slate-blue and green palette, pure white background, clean UI icon',
  },
  {
    id: 'benefit-abwicklung',
    dest: 'public/assets/footer/benefits/schnelle-abwicklung.png',
    w: 512,
    h: 512,
    icon: true,
    prompt:
      'Minimal flat vector icon of a fast digital document with checkmark, speed and efficiency, slate-blue and green palette, pure white background',
  },
  {
    id: 'compliance-train',
    dest: 'public/assets/compliance/customer-train.png',
    w: 1000,
    h: 700,
    prompt: 'Modern European high-speed train passing green countryside, customer-journey metaphor, soft editorial photography',
  },
  {
    id: 'compliance-mirror',
    dest: 'public/assets/compliance/journey-mirror.png',
    w: 1000,
    h: 700,
    prompt:
      'Person reflected softly in a clean glass office facade while walking past, self-reflection journey metaphor, calm professional tone, candid street crop',
  },
  {
    id: 'compliance-peace',
    dest: 'public/assets/compliance/peace-headphones.png',
    w: 1000,
    h: 700,
    prompt:
      'Peace of mind: person with headphones in a quiet bright living room armchair by a window, soft natural light, relaxed expression looking outside, Raisin everyday calm',
  },
];

function dalleSizeFor(item) {
  const ratio = item.w / item.h;
  if (item.icon || (ratio > 0.85 && ratio < 1.15)) return '1024x1024';
  if (ratio >= 1.15) return '1792x1024';
  return '1024x1792';
}

function gptImageSizeFor(item) {
  const ratio = item.w / item.h;
  if (item.icon || (ratio > 0.85 && ratio < 1.15)) return '1024x1024';
  if (ratio >= 1.15) return '1536x1024';
  return '1024x1536';
}

function buildPrompt(item) {
  if (item.icon) {
    return `${item.prompt}. No photorealism, no people faces, simple centered icon, lots of clean white padding.`;
  }
  return `${item.prompt}. ${STYLE}`;
}

async function generateOpenAiImage(item, apiKey, model) {
  const isGptImage = model.startsWith('gpt-image');
  const size = isGptImage ? gptImageSizeFor(item) : dalleSizeFor(item);

  const body = {
    model,
    prompt: buildPrompt(item),
    n: 1,
    size,
  };

  // gpt-image-1 returns b64 by default; dall-e-3 needs explicit format
  if (!isGptImage) {
    body.response_format = 'b64_json';
    body.quality = 'hd';
  } else {
    body.quality = 'high';
  }

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 400)}`);
  }

  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  const url = json?.data?.[0]?.url;

  let buf;
  if (b64) {
    buf = Buffer.from(b64, 'base64');
  } else if (url) {
    const imgRes = await fetch(url);
    if (!imgRes.ok) throw new Error(`Download HTTP ${imgRes.status}`);
    buf = Buffer.from(await imgRes.arrayBuffer());
  } else {
    throw new Error('No image data in response');
  }

  if (buf.length < 3000) throw new Error(`Image too small (${buf.length} bytes)`);
  return buf;
}

async function writeOptimized(buf, dest, w, h, quality = 85) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const optimized = await sharp(buf)
    .resize(w, h, { fit: 'cover', position: 'attention' })
    .png({ compressionLevel: 9, quality })
    .toBuffer();
  fs.writeFileSync(dest, optimized);
}

async function main() {
  loadDotEnv();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(
      [
        'OPENAI_API_KEY is not set.',
        '',
        'Add to .env:',
        '  OPENAI_API_KEY=sk-...',
        '',
        'Then run:',
        '  node scripts/generate-rebrand-marketing-images.mjs --force',
      ].join('\n')
    );
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const filterIds = args.filter((a) => !a.startsWith('-'));
  const items = filterIds.length ? MANIFEST.filter((x) => filterIds.includes(x.id)) : MANIFEST;

  if (items.length === 0) {
    console.error('No matching manifest entries.');
    process.exit(1);
  }

  // Prefer ChatGPT image model; fall back via OPENAI_IMAGE_MODEL=dall-e-3
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
  const delay = Number(process.env.REBRAND_IMG_DELAY_MS) || 1500;

  console.log(`Generating ${items.length} image(s) with OpenAI model=${model}…\n`);

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dest = path.join(ROOT, item.dest);

    if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 8000) {
      console.log(`[${i + 1}/${items.length}] skip ${item.id} (exists)`);
      continue;
    }

    try {
      const buf = await generateOpenAiImage(item, apiKey, model);
      await writeOptimized(buf, dest, item.w, item.h, item.quality ?? 85);
      ok++;
      console.log(
        `[${i + 1}/${items.length}] ✓ ${item.id} → ${item.dest} (${Math.round(fs.statSync(dest).size / 1024)} KB)`
      );
    } catch (e) {
      fail++;
      console.error(`[${i + 1}/${items.length}] ✗ ${item.id}: ${e.message}`);
    }

    if (i < items.length - 1) await sleep(delay);
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

main();
