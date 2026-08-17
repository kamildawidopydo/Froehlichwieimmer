/**
 * Generates Zinsstaffel comparison PDF (2 pages, A4 landscape) with Kapitalmitte branding.
 * Run: node scripts/generate-zinsstaffel-pdf.mjs [output-path]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCUMENT_TITLE = 'Kapitalmitte – Bankenvergleich | Flexibel sparen';
const DEFAULT_FILENAME = 'Kapitalmitte - Bankenvergleich Flexibel Sparen.pdf';
const OUT = process.argv[2] || path.join(process.env.USERPROFILE || '', 'Desktop', DEFAULT_FILENAME);
const LOGO_DIR = path.join(ROOT, 'public/assets/bank-logos');

const TIERS = [10000, 25000, 50000, 75000, 100000];

/** BBVA — premium partner tier */
const BBVA = {
  id: 'bbva',
  name: 'BBVA Deutschland',
  productSub: '(Flexgeld)',
  kontingentHeader: '(Flexgeld)',
  ladder: [3.0, 3.3, 3.55, 3.7, 3.88],
  ladderNote: '',
  rateSub: 'p. a. fest für 12 Monate',
  zinsgarantie: 'Volle 12 Monate',
  struktur: '3 Mon. gebunden + 9 Mon. verfügbar',
  laufzeit: '12 Monate',
    zinszahlung: 'Laufend oder am Ende',
  einlagensicherung: 'Bis 100.000 € EU-weit gesichert',
  minAnlage: '10.000 €',
  besonderheiten: 'Teilbindung in den ersten 3 Monaten',
  bonus: '100 € – 300 € je nach Investitionshöhe',
    fazit:
      'Stabil strukturierte Anlage mit kurzer Anfangsbindung und fester 12-Monats-Verzinsung.',
  winner: true,
  logo: 'bbva-official.svg',
};

/** Top German banks from kapitalmitte.com savings comparison (May 2026) */
const GERMAN_BANKS = [
  {
    id: 'renault',
    name: 'Renault Bank direkt',
    productSub: '(Tagesgeld)',
    kontingentHeader: '(Tagesgeld)',
    ladder: [2.7, 2.8, 2.85, 2.95, 3.0],
    ladderNote: '',
    rateSub: 'p. a.',
    zinsgarantie: 'Variabel — keine Laufzeitbindung',
    struktur: 'Täglich verfügbar',
    laufzeit: 'Unbefristet (Tagesgeld)',
    zinszahlung: 'Monatlich',
    einlagensicherung: 'Bis 100.000 € gesetzlich gesichert (EdB)',
    minAnlage: 'ab 1 €',
    besonderheiten: 'Deutsche Direktbank · BaFin-reguliert',
    bonus: '—',
    fazit:
      'Spitzenzins beim deutschen Tagesgeld mit monatlicher Gutschrift und EdB-Sicherung.',
    logo: 'renault-bank-direkt.svg',
  },
  {
    id: 'raisin',
    name: 'Raisin Bank',
    productSub: '(Festgeld)',
    kontingentHeader: '(Festgeld)',
    ladder: [2.6, 2.7, 2.75, 2.85, 2.9],
    ladderNote: '',
    rateSub: 'p. a. fest',
    zinsgarantie: 'Volle vereinbarte Laufzeit',
    struktur: 'Fester Zinssatz während der Laufzeit',
    laufzeit: '12 Monate',
    zinszahlung: 'Jährlich',
    einlagensicherung: 'Bis 100.000 € gesetzlich gesichert (Deutschland)',
    minAnlage: 'ab 10.000 €',
    besonderheiten: 'Deutsche Plattformbank · Fest gebunden',
    bonus: '—',
    fazit: 'Attraktives Festgeld mit planbarer Verzinsung über etablierte Partnerbank.',
    logo: 'raisin-bank.svg',
    logoUrl:
      'https://eu-images.contentstack.com/v3/assets/blt4a5ee0113ab335fb/bltac7489ace278046f/Raisin_Bank_Logo_RGB_V2.svg',
  },
  {
    id: 'suresse',
    name: 'Suresse Direkt Bank',
    productSub: '(Festgeld)',
    kontingentHeader: '(Festgeld)',
    ladder: [2.3, 2.35, 2.4, 2.45, 2.5],
    ladderNote: '',
    rateSub: 'p. a. fest für 12 Monate',
    zinsgarantie: 'Volle 12 Monate',
    struktur: 'Fester Zinssatz während der Laufzeit',
    laufzeit: '12 Monate',
    zinszahlung: 'Jährlich',
    einlagensicherung: 'Bis 100.000 € gesetzlich gesichert (EdB)',
    minAnlage: 'ab 1.000 €',
    besonderheiten: 'Deutsche Einlagensicherung · Fest gebunden',
    bonus: '—',
    fazit: 'Planbare 12-Monats-Festgeldanlage mit fester Verzinsung und EdB-Sicherung.',
    logo: 'suresse-direkt-bank.webp',
  },
  {
    id: 'trade-republic',
    name: 'Trade Republic Bank',
    productSub: '(Tagesgeld)',
    kontingentHeader: '(Tagesgeld)',
    ladder: [2.55, 2.65, 2.7, 2.8, 2.85],
    ladderNote: '',
    rateSub: 'p. a.',
    zinsgarantie: 'Variabel — keine Laufzeitbindung',
    struktur: 'Täglich verfügbar',
    laufzeit: 'Unbefristet (Tagesgeld)',
    zinszahlung: 'Monatlich',
    einlagensicherung: 'Bis 100.000 € gesetzlich gesichert (EdB)',
    minAnlage: 'ab 1 €',
    besonderheiten: 'Voll digital · BaFin-reguliert',
    bonus: '—',
    fazit: 'Modernes Tagesgeld mit wettbewerbsfähigem Zins und App-Steuerung.',
    logo: 'trade-republic.svg',
  },
];

const ALL_BANKS = [BBVA, ...GERMAN_BANKS];

function fmt(n) {
  return n.toLocaleString('de-DE');
}

function pct(n) {
  return n.toFixed(2).replace('.', ',') + ' %';
}

function headlineRate(bank) {
  return bank.ladder[bank.ladder.length - 1];
}

async function rasterizeBrandLogo(input, height = 72) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height: imgHeight } = info;
  let minX = width;
  let maxX = 0;
  let minY = imgHeight;
  let maxY = 0;

  const isInk = (x, y) => {
    const i = (y * width + x) * 4;
    const a = data[i + 3];
    const r = data[i];
    return a > 40 && r < 120;
  };

  for (let y = 0; y < imgHeight; y++) {
    for (let x = 0; x < width; x++) {
      if (isInk(x, y)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const buf = await sharp(input)
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .resize({ height, fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function rasterizeLogo(input, height = 56) {
  let pipeline = sharp(input, { density: 300 });
  if (path.extname(input).toLowerCase() === '.svg') {
    pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255, alpha: 0 } });
  }
  if (path.extname(input).toLowerCase() === '.webp') {
    pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
  }
  const buf = await pipeline
    .resize({ height, fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function fetchLogoDataUrl(url, height = 56) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Kapitalmitte-PDF/1.0', Accept: 'image/*' },
  });
  if (!res.ok) throw new Error(`Logo fetch failed: ${url} (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const png = await sharp(buf).resize({ height, fit: 'inside' }).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

async function resolveBankLogo(bank) {
  const localPath = path.join(LOGO_DIR, bank.logo);
  if (fs.existsSync(localPath)) {
    return rasterizeLogo(localPath, 60);
  }
  if (bank.logoUrl) {
    const dataUrl = await fetchLogoDataUrl(bank.logoUrl, 60);
    try {
      await fs.promises.writeFile(localPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
    } catch {
      /* cache optional */
    }
    return dataUrl;
  }
  throw new Error(`Logo not found for ${bank.name}: ${bank.logo}`);
}

async function loadLogos() {
  const bbvaPath = path.join(LOGO_DIR, 'bbva-official.svg');
  if (!fs.existsSync(bbvaPath)) {
    const res = await fetch('https://commons.wikimedia.org/wiki/Special:FilePath/BBVA_2019.svg', {
      headers: { 'User-Agent': 'Kapitalmitte-PDF/1.0' },
    });
    if (res.ok) await fs.promises.writeFile(bbvaPath, Buffer.from(await res.arrayBuffer()));
  }

  const brand = await rasterizeBrandLogo(path.join(ROOT, 'public/assets/logo/kapitalmitte-logo.png'), 72);
  const bankLogos = {};
  for (const bank of ALL_BANKS) {
    bankLogos[bank.id] = await resolveBankLogo(bank);
  }
  return { brand, bankLogos };
}

function bankHeadHtml(bank, logoSrc) {
  const winner = bank.winner
    ? `<div class="winner-badge">ZINSSIEGER</div>`
    : '';
  const thClass = bank.winner ? ' class="winner"' : '';
  return `<th${thClass}>
    <div class="bank-head">
      <div class="logo-wrap"><img src="${logoSrc}" alt="${bank.name}"/></div>
      <div class="name">${bank.name}</div>
      <div class="sub">${bank.productSub}</div>
      ${winner}
    </div>
  </th>`;
}

function ladderCellHtml(bank, tierIndex) {
  const rate = bank.ladder[tierIndex];
  const note = bank.ladderNote
    ? `<br/><span style="font-size:10px;color:#3d4f63;font-weight:600;">${bank.ladderNote}</span>`
    : '';
  return `<td>${pct(rate)}${note}</td>`;
}

function buildHtml({ brand, bankLogos }) {
  const bankHeads = ALL_BANKS.map((b) => bankHeadHtml(b, bankLogos[b.id])).join('\n        ');
  const rateCells = ALL_BANKS.map(
    (b) =>
      `<td class="rate">${pct(headlineRate(b))}<span class="rate-sub">${b.rateSub}</span></td>`,
  ).join('\n        ');
  const zinsgarantieCells = ALL_BANKS.map((b) => `<td>${b.zinsgarantie}</td>`).join('\n        ');
  const strukturCells = ALL_BANKS.map((b) => `<td>${b.struktur}</td>`).join('\n        ');
  const laufzeitCells = ALL_BANKS.map((b) => `<td>${b.laufzeit}</td>`).join('\n        ');
  const zinszahlungCells = ALL_BANKS.map((b) => `<td>${b.zinszahlung}</td>`).join('\n        ');
  const einlageCells = ALL_BANKS.map((b) => `<td>${b.einlagensicherung}</td>`).join('\n        ');
  const minCells = ALL_BANKS.map((b) => `<td>${b.minAnlage}</td>`).join('\n        ');
  const besonderCells = ALL_BANKS.map((b) => `<td>${b.besonderheiten}</td>`).join('\n        ');
  const bonusCells = ALL_BANKS.map((b) => `<td>${b.bonus}</td>`).join('\n        ');
  const fazitCells = ALL_BANKS.map((b) => `<td>${b.fazit}</td>`).join('\n        ');

  const ladderHeaders = ALL_BANKS.map(
    (b) =>
      `<th>${b.name}<br/><span style="font-weight:600;font-size:10px;">${b.kontingentHeader}</span></th>`,
  ).join('\n        ');

  const ladderRows = TIERS.map((amt, i) => {
    const cells = ALL_BANKS.map((b) => ladderCellHtml(b, i)).join('\n          ');
    return `<tr>
          <td class="amount">${fmt(amt)} €</td>
          ${cells}
        </tr>`;
  }).join('\n      ');

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8"/>
<title>${DOCUMENT_TITLE}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: #1a2332; font-size: 13px; line-height: 1.42; }

  .page {
    width: 297mm;
    height: 210mm;
    padding: 11mm 14mm 10mm;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .page:last-child { page-break-after: auto; }

  .page-top { flex: 0 0 auto; }
  .page-main { flex: 1 1 auto; display: flex; flex-direction: column; min-height: 0; margin: 4px 0 6px; }
  .page-bottom { flex: 0 0 auto; margin-top: auto; }

  .page-1 { padding: 10mm 13mm 9mm; }
  .page-1 .header { margin-bottom: 6px; }
  .page-1 .header-left h1 { font-size: 20px; margin-bottom: 2px; }
  .page-1 .header-left h2 { font-size: 13.5px; }
  .page-1 .header-right img { height: 36px; margin-left: auto; }
  .page-1 .page-main { flex: 1 1 0; min-height: 0; margin: 5px 0 7px; }

  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 7px; }
  .header-left h1 { font-size: 22px; font-weight: 700; color: #0a3a5c; line-height: 1.15; margin-bottom: 3px; }
  .header-left h2 { font-size: 14px; font-weight: 600; color: #3d4f63; }
  .header-right { display: flex; justify-content: flex-end; align-items: flex-start; }
  .header-brand { display: inline-flex; flex-direction: column; align-items: stretch; gap: 3px; }
  .header-right img { height: 40px; width: auto; max-width: 100%; object-fit: contain; object-position: right center; display: block; margin-left: auto; }
  .header-right .site { font-size: 9.5px; color: #0a3a5c; letter-spacing: 0; text-align: right; white-space: nowrap; line-height: 1; width: 100%; }
  .accent-bar { height: 4px; background: linear-gradient(90deg, #0a3a5c 0%, #0d4a76 25%, #1a5f8a 50%, #d4a847 75%, #b8922f 100%); border-radius: 2px; }

  .fill-table { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .page-1 .fill-table { flex: 1 1 0; height: 100%; }
  .page-1 .compare-table { flex: 1 1 0; height: 100%; min-height: 0; }
  .page-1 .compare-table thead tr { height: 14%; }
  .page-1 .compare-table tbody tr { height: 8.6%; }
  .page-1 table { font-size: 12px; }
  th, td { border: 1px solid #c8d4e0; padding: 8px 7px; vertical-align: middle; text-align: center; word-wrap: break-word; overflow-wrap: anywhere; }
  .page-1 th, .page-1 td { padding: 5px 6px; line-height: 1.32; }
  th { background: #0a3a5c; color: #fff; font-size: 12px; font-weight: 700; line-height: 1.3; }
  th.feature { background: #123d66; text-align: left; width: 11%; padding-left: 9px; font-size: 12.5px; }
  .page-1 th.feature { font-size: 12px; padding-left: 7px; }
  td.feature { text-align: left; font-weight: 700; color: #0a3a5c; background: #f5f8fb; font-size: 12.5px; padding-left: 9px; vertical-align: middle; }
  .page-1 td.feature { font-size: 12px; padding-left: 7px; }
  tbody td:not(.feature) { font-size: 12.5px; font-weight: 600; color: #1a2332; line-height: 1.38; }
  .page-1 tbody td:not(.feature) { font-size: 12px; line-height: 1.32; }
  td.rate { font-weight: 800; color: #0a3a5c; font-size: 16px; vertical-align: middle; }
  .page-1 td.rate { font-size: 15px; }
  td.rate-sub { font-size: 11px; color: #3d4f63; font-weight: 600; display: block; margin-top: 2px; }
  .page-1 td.rate-sub { font-size: 10.5px; margin-top: 2px; }

  .bank-head { padding: 8px 5px 10px; min-height: 76px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; }
  .page-1 .bank-head { padding: 5px 4px 6px; min-height: 0; height: 100%; gap: 4px; }
  .bank-head .logo-wrap { background: #fff; border-radius: 5px; padding: 6px 10px; display: flex; align-items: center; justify-content: center; min-height: 38px; min-width: 84px; }
  .page-1 .bank-head .logo-wrap { padding: 5px 8px; min-height: 34px; min-width: 76px; }
  .bank-head img { max-height: 30px; max-width: 88px; width: auto; height: auto; object-fit: contain; display: block; }
  .page-1 .bank-head img { max-height: 28px; max-width: 82px; }
  .bank-head .name { font-size: 11px; font-weight: 700; color: #fff; line-height: 1.25; text-align: center; }
  .page-1 .bank-head .name { font-size: 10.5px; line-height: 1.2; }
  .bank-head .sub { font-size: 9.5px; font-weight: 600; color: rgba(255,255,255,0.9); line-height: 1.2; text-align: center; }
  .page-1 .bank-head .sub { font-size: 9.5px; }
  .winner { background: linear-gradient(180deg, #e8c547 0%, #d4a847 100%) !important; color: #1a2332 !important; }
  .winner .name { color: #1a2332; }
  .winner-badge { display: inline-block; background: #0a3a5c; color: #fff; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 2px; letter-spacing: 0.06em; }
  .page-1 .winner-badge { font-size: 8.5px; padding: 2px 5px; }

  .fazit-row td { text-align: left; font-size: 11px; font-weight: 600; background: #fafbfc; padding: 5px 6px; line-height: 1.32; vertical-align: middle; }
  .page-1 .fazit-row td { font-size: 11.5px; padding: 6px 7px; line-height: 1.34; }
  .fazit-row td.feature { background: #eef3f8; font-weight: 700; font-size: 11.5px; vertical-align: middle; }
  .page-1 .fazit-row td.feature { font-size: 12px; }

  .footnote { font-size: 10px; color: #5a6b7d; line-height: 1.35; border-top: 1px solid #e1e6ed; padding-top: 6px; }
  .page-1 .footnote { font-size: 9.5px; line-height: 1.32; padding-top: 5px; }

  .p2-title { font-size: 19px; font-weight: 700; color: #0a3a5c; margin-bottom: 3px; }
  .p2-sub { font-size: 12.5px; color: #3d4f63; margin-bottom: 4px; }
  .p2-intro { font-size: 12px; color: #3d4f63; margin-bottom: 8px; line-height: 1.5; }

  .ladder-wrap { flex: 1; display: flex; flex-direction: column; justify-content: center; margin-bottom: 8px; }
  .ladder th { font-size: 11.5px; font-weight: 700; padding: 9px 6px; line-height: 1.3; }
  .ladder td { font-size: 14px; font-weight: 700; padding: 11px 7px; color: #0a3a5c; }
  .ladder td.amount { font-weight: 800; color: #0a3a5c; background: #f5f8fb; text-align: left; padding-left: 11px; font-size: 14px; }

  .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px; }
  .info-box { border: 1px solid #c8d4e0; border-left: 3px solid #0a3a5c; border-radius: 4px; padding: 10px 11px; background: #f5f8fb; min-height: 52px; }
  .info-box.wide { grid-column: 1 / -1; border-left-color: #d4a847; min-height: auto; }
  .info-box h4 { font-size: 11px; font-weight: 800; color: #0a3a5c; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
  .info-box p { font-size: 10.5px; font-weight: 600; color: #3d4f63; line-height: 1.42; }

  .cta { text-align: center; margin-bottom: 6px; font-size: 12px; color: #0a3a5c; font-weight: 700; line-height: 1.5; }
  .footer-note { font-size: 10px; color: #8a96a8; text-align: center; }
</style>
</head>
<body>

<div class="page page-1">
  <div class="page-top">
    <div class="header">
      <div class="header-left">
        <h1>Flexibel sparen — 12 Monate fester Zins</h1>
        <h2>Fünf starke Banken im Vergleich</h2>
      </div>
      <div class="header-right">
        <div class="header-brand">
          <img src="${brand}" alt="Kapitalmitte"/>
          <div class="site">www.kapitalmitte.com</div>
        </div>
      </div>
    </div>
    <div class="accent-bar"></div>
  </div>

  <div class="page-main">
    <div class="fill-table">
  <table class="compare-table">
    <thead>
      <tr>
        <th class="feature">Merkmal</th>
        ${bankHeads}
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="feature">Zinssatz p. a.</td>
        ${rateCells}
      </tr>
      <tr>
        <td class="feature">Zinsgarantie</td>
        ${zinsgarantieCells}
      </tr>
      <tr>
        <td class="feature">Struktur</td>
        ${strukturCells}
      </tr>
      <tr>
        <td class="feature">Laufzeit</td>
        ${laufzeitCells}
      </tr>
      <tr>
        <td class="feature">Zinszahlung</td>
        ${zinszahlungCells}
      </tr>
      <tr>
        <td class="feature">Einlagensicherung</td>
        ${einlageCells}
      </tr>
      <tr>
        <td class="feature">Mindest-/Maximalanlage</td>
        ${minCells}
      </tr>
      <tr>
        <td class="feature">Besonderheiten</td>
        ${besonderCells}
      </tr>
      <tr>
        <td class="feature">Bonus</td>
        ${bonusCells}
      </tr>
      <tr class="fazit-row">
        <td class="feature">Unser Fazit</td>
        ${fazitCells}
      </tr>
    </tbody>
  </table>
    </div>
  </div>

  <div class="page-bottom">
  <div class="footnote">
    Exklusive Konditionen durch Rahmenvereinbarungen mit unseren Partnerbanken. Individuelle Konditionen je nach Anlagebetrag — Details siehe Folgeseite.<br/>
    <strong>Stand: Mai 2026</strong> · Alle Angaben ohne Gewähr. Einlagensicherung bis 100.000 € pro Kunde und Bank. EU-weit gesichert gemäß Richtlinie 2014/49/EU.
  </div>
  </div>
</div>

<div class="page">
  <div class="page-top">
    <div class="header">
      <div class="header-left">
        <div class="p2-title">Individuelle Zinsstaffel nach Anlagebetrag</div>
        <div class="p2-sub">Feste Zinsen über 12 Monate</div>
      </div>
      <div class="header-right">
        <div class="header-brand">
          <img src="${brand}" alt="Kapitalmitte"/>
          <div class="site">www.kapitalmitte.com</div>
        </div>
      </div>
    </div>
    <div class="accent-bar"></div>
    <p class="p2-intro">Dank unserer Rahmenvereinbarungen mit den Banken erhalten Sie je nach Anlagebetrag individuelle Zinssätze. Je höher der Anlagebetrag, desto attraktiver der Zinssatz.</p>
  </div>

  <div class="page-main">
  <div class="ladder-wrap">
  <table class="ladder">
    <thead>
      <tr>
        <th style="width:11%;text-align:left;padding-left:8px;">Anlagebetrag (EUR)</th>
        ${ladderHeaders}
      </tr>
    </thead>
    <tbody>
      ${ladderRows}
    </tbody>
  </table>
  </div>

  <div class="info-grid">
    <div class="info-box wide"><h4>Hinweis</h4><p>Die dargestellten Zinssätze ergeben sich aus exklusiven Rahmenvereinbarungen im Rahmen unserer Partnerschaft. Die Konditionen gelten für eine Laufzeit von 12 Monaten und können je nach Marktlage angepasst werden.</p></div>
    <div class="info-box"><h4>Sicherheit</h4><p>Einlagensicherung bis 100.000 € pro Kunde und Bank — EU-weit gesichert.</p></div>
    <div class="info-box"><h4>Flexibilität</h4><p>3 Monate gebunden, dann 9 Monate verfügbar — maximale Flexibilität für Sie.</p></div>
    <div class="info-box"><h4>Planbarkeit</h4><p>Fester Zinssatz über die gesamte vereinbarte Laufzeit.</p></div>
    <div class="info-box"><h4>Bonus</h4><p>Attraktive Boni je nach Investitionshöhe bei teilnehmenden Partnerbanken.</p></div>
    <div class="info-box"><h4>Top-Zinsen</h4><p>Exklusive Konditionen durch unsere Rahmenvereinbarungen mit renommierten Banken.</p></div>
    <div class="info-box"><h4>Transparenz</h4><p>Klare Konditionen, verständliche Aufbereitung und persönliche Beratung inklusive.</p></div>
  </div>
  </div>

  <div class="page-bottom">
  <div class="cta">
    Gerne beraten wir Sie persönlich und finden die optimale Lösung für Ihre individuelle Anlagestrategie. Sprechen Sie uns an — wir sind für Sie da.
  </div>

  <div class="footer-note">
    Stand: Mai 2026 · Alle Angaben ohne Gewähr. Einlagensicherung bis 100.000 € pro Kunde und Bank. EU-weit gesichert gemäß Richtlinie 2014/49/EU.
  </div>
  </div>
</div>

</body>
</html>`;
}

async function main() {
  console.log('Logos werden vorbereitet…');
  const logoData = await loadLogos();
  const html = buildHtml(logoData);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.pdf({
    path: OUT,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  await browser.close();

  console.log('PDF erstellt:', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
