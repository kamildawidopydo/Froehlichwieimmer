/**
 * Renders navy/gold Kapitalmitte story slides + highlight covers to SVG + PNG.
 * Run: node scripts/render-instagram-stories.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const base = path.join(__dirname, '../public/assets/social/instagram');

const DEFS = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="#0A2540"/>
      <stop offset="55%" stop-color="#123d66"/>
      <stop offset="100%" stop-color="#0d3358"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#E8C547"/>
      <stop offset="100%" stop-color="#C9A227"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a4a7a"/>
      <stop offset="100%" stop-color="#0f3558"/>
    </linearGradient>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.5" fill="rgba(255,255,255,0.06)"/>
    </pattern>
  </defs>`;

const footer = '@kapitalmitte · Alexander Wahl Vermögensverwaltung GmbH';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const wrap = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920">${DEFS}
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <rect width="1080" height="1920" fill="url(#dots)"/>
  ${body}
  <text x="540" y="1780" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="system-ui,sans-serif" font-size="20">${footer}</text>
</svg>`;

const header = (title, subtitle, accent = 'gold') => `
  <text x="80" y="420" fill="#fff" font-family="system-ui,sans-serif" font-size="56" font-weight="800">${esc(title)}</text>
  <text x="80" y="490" fill="rgba(255,255,255,0.82)" font-family="system-ui,sans-serif" font-size="28">${esc(subtitle)}</text>
  <rect x="80" y="520" width="220" height="4" rx="2" fill="url(#${accent})"/>`;

const badge = (y, big, small) => `
  <g transform="translate(540,${y})">
    <rect x="-200" y="0" width="400" height="120" rx="60" fill="rgba(255,255,255,0.06)" stroke="rgba(201,162,39,0.45)" stroke-width="2"/>
    <text x="0" y="52" text-anchor="middle" fill="url(#gold)" font-family="system-ui,sans-serif" font-size="44" font-weight="800">${esc(big)}</text>
    <text x="0" y="92" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-family="system-ui,sans-serif" font-size="24">${esc(small)}</text>
  </g>`;

const filterRow = (y, label, pct, color) => `
  <text x="120" y="${y}" fill="rgba(255,255,255,0.7)" font-family="system-ui,sans-serif" font-size="24">${esc(label)}</text>
  <rect x="120" y="${y + 16}" width="840" height="20" rx="10" fill="rgba(255,255,255,0.08)"/>
  <rect x="120" y="${y + 16}" width="${840 * pct}" height="20" rx="10" fill="${color}" opacity="0.85"/>`;

const card = (x, y, w, h, accent, icon, title, sub, highlight = false) => `
  <g transform="translate(${x},${y})">
    <rect width="${w}" height="${h}" rx="24" fill="url(#card)" stroke="${highlight ? 'url(#gold)' : 'rgba(255,255,255,0.12)'}" stroke-width="${highlight ? 3 : 2}"/>
    <rect x="24" y="24" width="${w - 48}" height="8" rx="4" fill="${accent}"/>
    <circle cx="${w / 2}" cy="140" r="52" fill="rgba(255,255,255,0.06)" stroke="${accent}" stroke-width="3"/>
    <text x="${w / 2}" y="152" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="36">${esc(icon)}</text>
    <text x="${w / 2}" y="250" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="28" font-weight="700">${esc(title)}</text>
    <text x="${w / 2}" y="290" text-anchor="middle" fill="rgba(255,255,255,0.65)" font-family="system-ui,sans-serif" font-size="20">${esc(sub)}</text>
  </g>`;

const slides = {
  'sparvergleich-1': null, // keep existing custom file
  'sparvergleich-2': wrap(`
    ${header('Filter', 'Nach Laufzeit &amp; Mindestanlage sortieren')}
    ${filterRow(620, 'Laufzeit', 0.72, 'url(#gold)')}
    ${filterRow(700, 'Mindestanlage', 0.55, '#1877F2')}
    ${filterRow(780, 'Land / Währung', 0.88, '#057642')}
    ${filterRow(860, 'Neukunden-Bonus', 0.42, '#C9A227')}
    ${card(80, 980, 280, 280, '#1877F2', '1J', '1 Jahr', 'Festgeld', false)}
    ${card(400, 980, 280, 280, 'url(#gold)', '3M', '3 Monate', 'Flexgeld', true)}
    ${card(720, 980, 280, 280, '#057642', '∞', 'Täglich', 'Tagesgeld', false)}
    ${badge(1380, 'Live', 'Filter auf kapitalmitte.com')}
  `),
  'zinsen-1': wrap(`
    ${header('Zinsen', 'Aktuelle Konditionen der Partnerbanken')}
    ${filterRow(620, 'Tagesgeld Ø', 0.68, '#1877F2')}
    ${filterRow(700, 'Flexgeld Ø', 0.75, 'url(#gold)')}
    ${filterRow(780, 'Festgeld 12M', 0.82, '#057642')}
    ${filterRow(860, 'Festgeld 24M', 0.91, '#C9A227')}
    <text x="540" y="1100" text-anchor="middle" fill="rgba(255,255,255,0.55)" font-family="system-ui,sans-serif" font-size="22">Stand: Vorschau · keine Anlageberatung</text>
    ${badge(1280, '3,4 % p.a.', 'Beispiel Festgeld 12M')}
  `),
  'zinsen-2': wrap(`
    ${header('Rechner', 'Szenarien auf kapitalmitte.com testen')}
    ${card(80, 620, 440, 320, 'url(#gold)', '€', 'Betrag', '10.000 €', true)}
    ${card(560, 620, 440, 320, '#1877F2', '12M', 'Laufzeit', '12 Monate', false)}
    <rect x="120" y="1000" width="840" height="280" rx="24" fill="url(#card)" stroke="rgba(201,162,39,0.35)" stroke-width="2"/>
    <text x="540" y="1080" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-family="system-ui,sans-serif" font-size="24">Ergebnis (Beispiel)</text>
    <text x="540" y="1160" text-anchor="middle" fill="url(#gold)" font-family="system-ui,sans-serif" font-size="64" font-weight="800">+ 340 €</text>
    <text x="540" y="1220" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="system-ui,sans-serif" font-size="26">Zinsertrag nach 12 Monaten</text>
    ${badge(1380, '→', 'Link in Bio · Zinsrechner')}
  `),
  'sicherheit-1': wrap(`
    ${header('Einlage', 'Gesetzlicher Schutz in der EU erklärt')}
    ${card(80, 620, 280, 340, '#057642', '🛡', '100.000 €', 'pro Person &amp; Bank', false)}
    ${card(400, 620, 280, 340, 'url(#gold)', '🇪🇺', 'EU-Richtlinie', 'Einlagensicherung', true)}
    ${card(720, 620, 280, 340, '#1877F2', '✓', 'Reguliert', 'Partnerbanken', false)}
    <text x="540" y="1080" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-family="system-ui,sans-serif" font-size="26">Einlagen liegen bei der Partnerbank —</text>
    <text x="540" y="1125" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-family="system-ui,sans-serif" font-size="26">nicht bei Kapitalmitte.</text>
    ${badge(1280, 'EU', 'Gesetzlicher Schutz')}
  `),
  'sicherheit-2': wrap(`
    ${header('Transparenz', 'Kein Kundengeld bei Kapitalmitte')}
    <rect x="120" y="620" width="840" height="480" rx="28" fill="url(#card)" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
    <text x="540" y="720" text-anchor="middle" fill="url(#gold)" font-family="system-ui,sans-serif" font-size="32" font-weight="700">Vermittler ≠ Verwahrer</text>
    <text x="540" y="800" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="system-ui,sans-serif" font-size="24">Kapitalmitte vermittelt Angebote</text>
    <text x="540" y="850" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="system-ui,sans-serif" font-size="24">regulierter EU-Partnerbanken.</text>
    <rect x="220" y="920" width="640" height="4" rx="2" fill="rgba(255,255,255,0.15)"/>
    <text x="540" y="980" text-anchor="middle" fill="rgba(255,255,255,0.65)" font-family="system-ui,sans-serif" font-size="22">AIF-KVG · § 44 KAGB · Frankfurt</text>
    ${badge(1280, '100 %', 'Transparenz im Impressum')}
  `),
  'team-1': wrap(`
    ${header('Frankfurt', 'Persönliche Betreuung aus dem Büro')}
    <rect x="120" y="620" width="840" height="400" rx="28" fill="url(#card)" stroke="rgba(201,162,39,0.3)" stroke-width="2"/>
    <text x="540" y="760" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="48" font-weight="700">Frankfurt am Main</text>
    <text x="540" y="830" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-family="system-ui,sans-serif" font-size="26">Mainzer Landstraße · Büro vor Ort</text>
    <text x="540" y="890" text-anchor="middle" fill="rgba(255,255,255,0.55)" font-family="system-ui,sans-serif" font-size="22">Termine nach Vereinbarung</text>
    ${card(200, 1080, 280, 240, '#1877F2', '📞', 'Telefon', 'Mo–Fr', false)}
    ${card(400, 1080, 280, 240, 'url(#gold)', '✉', 'E-Mail', 'Antwort 24h', true)}
    ${card(600, 1080, 280, 240, '#057642', '📍', 'Vor Ort', 'Frankfurt', false)}
  `),
  'team-2': wrap(`
    ${header('Kontakt', 'E-Mail &amp; Telefon auf der Website')}
    ${card(140, 620, 800, 200, 'url(#gold)', '✉', 'info@kapitalmitte.com', 'E-Mail', true)}
    ${card(140, 860, 800, 200, '#1877F2', '📞', '+49 74 …', 'Telefon · Website', false)}
    ${card(140, 1100, 800, 200, '#057642', '🌐', 'kapitalmitte.com', 'Impressum &amp; Kontakt', false)}
    <text x="540" y="1420" text-anchor="middle" fill="rgba(255,255,255,0.55)" font-family="system-ui,sans-serif" font-size="22">Keine Anlageberatung über Social Media.</text>
    ${badge(1520, '→', 'Link in Bio')}
  `),
  'faq-1': wrap(`
    ${header('FAQ', 'Häufige Fragen zum Sparvergleich')}
    <rect x="120" y="600" width="840" height="100" rx="16" fill="url(#card)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="160" y="660" fill="#fff" font-family="system-ui,sans-serif" font-size="24" font-weight="600">Wie funktioniert der Vergleich?</text>
    <rect x="120" y="720" width="840" height="100" rx="16" fill="url(#card)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="160" y="780" fill="#fff" font-family="system-ui,sans-serif" font-size="24" font-weight="600">Ist meine Einlage sicher?</text>
    <rect x="120" y="840" width="840" height="100" rx="16" fill="url(#card)" stroke="rgba(201,162,39,0.4)" stroke-width="2"/>
    <text x="160" y="900" fill="#fff" font-family="system-ui,sans-serif" font-size="24" font-weight="600">Was kostet die Vermittlung?</text>
    <rect x="120" y="960" width="840" height="100" rx="16" fill="url(#card)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="160" y="1020" fill="#fff" font-family="system-ui,sans-serif" font-size="24" font-weight="600">Wie lange dauert die Kontoeröffnung?</text>
    ${badge(1280, 'FAQ', 'Antworten auf der Website')}
  `),
  'faq-2': wrap(`
    ${header('Bonus', 'Bedingungen je Partnerbank')}
    ${card(80, 620, 440, 320, 'url(#gold)', '300 €', 'Max. Bonus', 'Neukunden', true)}
    ${card(560, 620, 440, 320, '#1877F2', '18T', 'Auszahlung', 'ca. 18 Tage', false)}
    <text x="540" y="1080" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-family="system-ui,sans-serif" font-size="26">Bedingungen stehen transparent</text>
    <text x="540" y="1125" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-family="system-ui,sans-serif" font-size="26">im jeweiligen Angebot — vor Abschluss.</text>
    ${badge(1280, 'bis 300 €', 'Willkommensbonus')}
  `),
};

const highlightCovers = {
  sparvergleich: { icon: '⚖', label: 'Spar', color: '#1877F2' },
  zinsen: { icon: '%', label: 'Zinsen', color: '#C9A227' },
  sicherheit: { icon: '🛡', label: 'Sicher', color: '#057642' },
  team: { icon: '👥', label: 'Team', color: '#1877F2' },
  faq: { icon: '?', label: 'FAQ', color: '#C9A227' },
};

const highlightSvg = (id, { icon, label, color }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0A2540"/>
      <stop offset="100%" stop-color="#123d66"/>
    </linearGradient>
    <linearGradient id="gr" x1="0" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F58529"/>
      <stop offset="35%" stop-color="#DD2A7B"/>
      <stop offset="70%" stop-color="#8134AF"/>
      <stop offset="100%" stop-color="#515BD4"/>
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="96" fill="url(#gr)" stroke="none"/>
  <circle cx="100" cy="100" r="88" fill="url(#hg)"/>
  <circle cx="100" cy="88" r="36" fill="${color}" opacity="0.2" stroke="${color}" stroke-width="2"/>
  <text x="100" y="98" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="28">${icon}</text>
  <text x="100" y="148" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-family="system-ui,sans-serif" font-size="16" font-weight="700">${label}</text>
</svg>`;

async function main() {
  fs.mkdirSync(path.join(base, 'stories'), { recursive: true });
  fs.mkdirSync(path.join(base, 'highlights'), { recursive: true });

  for (const [name, svg] of Object.entries(slides)) {
    if (svg === null) continue;
    const svgPath = path.join(base, `stories/${name}.svg`);
    const pngPath = path.join(base, `stories/${name}.png`);
    fs.writeFileSync(svgPath, svg);
    await sharp(svgPath).resize(1080, 1920).png({ quality: 92 }).toFile(pngPath);
    console.log('OK stories/', name);
  }

  // sparvergleich-1 png refresh if svg exists
  const sp1 = path.join(base, 'stories/sparvergleich-1.svg');
  if (fs.existsSync(sp1)) {
    await sharp(sp1).resize(1080, 1920).png({ quality: 92 }).toFile(path.join(base, 'stories/sparvergleich-1.png'));
    console.log('OK stories/sparvergleich-1 (refresh)');
  }

  for (const [id, meta] of Object.entries(highlightCovers)) {
    const svgPath = path.join(base, `highlights/${id}.svg`);
    const pngPath = path.join(base, `highlights/${id}.png`);
    const svg = highlightSvg(id, meta);
    fs.writeFileSync(svgPath, svg);
    await sharp(svgPath).resize(200, 200).png({ quality: 90 }).toFile(pngPath);
    console.log('OK highlights/', id);
  }

  console.log('Done — all story slides + highlight covers rendered.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
