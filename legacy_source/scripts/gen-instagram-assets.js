/**
 * Instagram-specific preview assets (square posts, story slides, highlight covers, comment avatars).
 * Distinct visual language from Facebook/LinkedIn — gradient frames, 1:1 crop.
 * SVG fallbacks only. Production PNGs: run:
 *   node scripts/render-instagram-stories.js
 * Optional AI PNG overrides: node scripts/ingest-instagram-pngs.js
 */
const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '../public/assets/social/instagram');
const dirs = ['posts', 'highlights', 'stories', 'avatars/comments'];
dirs.forEach((d) => fs.mkdirSync(path.join(base, d), { recursive: true }));

const IG_GRADIENT =
  '<defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#F58529"/><stop offset="35%" stop-color="#DD2A7B"/><stop offset="70%" stop-color="#8134AF"/><stop offset="100%" stop-color="#515BD4"/></linearGradient></defs>';

const squarePost = (title, sub, accent, pattern = 'dots') => {
  const pat =
    pattern === 'lines'
      ? '<path d="M0 80h1080M0 200h1080M0 320h1080M0 440h1080M0 560h1080M0 680h1080M0 800h1080M0 920h1080" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>'
      : '<circle cx="120" cy="120" r="3" fill="rgba(255,255,255,0.12)"/><circle cx="240" cy="360" r="4" fill="rgba(255,255,255,0.08)"/><circle cx="900" cy="200" r="5" fill="rgba(255,255,255,0.1)"/><circle cx="800" cy="850" r="3" fill="rgba(255,255,255,0.12)"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">${IG_GRADIENT}
<rect width="1080" height="1080" fill="#0f1419"/>
<rect x="48" y="48" width="984" height="984" rx="24" fill="${accent}" opacity="0.92"/>
${pat}
<rect x="48" y="48" width="984" height="12" rx="6" fill="url(#ig)"/>
<text x="540" y="480" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="52" font-weight="800" letter-spacing="0.04em">${title}</text>
<text x="540" y="560" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-family="system-ui,sans-serif" font-size="28">${sub}</text>
<text x="72" y="120" fill="rgba(255,255,255,0.5)" font-family="system-ui,sans-serif" font-size="22">@kapitalmitte</text>
</svg>`;
};

const storySlide = (headline, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920">${IG_GRADIENT}
<rect width="1080" height="1920" fill="#111"/>
<rect width="1080" height="1920" fill="url(#ig)" opacity="0.35"/>
<text x="80" y="280" fill="#fff" font-family="system-ui,sans-serif" font-size="44" font-weight="700">${headline}</text>
<text x="80" y="380" fill="rgba(255,255,255,0.9)" font-family="system-ui,sans-serif" font-size="28" width="920">${body}</text>
<text x="540" y="1780" text-anchor="middle" fill="rgba(255,255,255,0.45)" font-family="system-ui,sans-serif" font-size="20">Alexander Wahl Vermögensverwaltung GmbH</text>
</svg>`;

const highlightCover = (label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${IG_GRADIENT}
<circle cx="100" cy="100" r="96" fill="#1a1a1a" stroke="url(#ig)" stroke-width="6"/>
<text x="100" y="108" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="18" font-weight="700">${label}</text>
</svg>`;

const commentAvatar = (initials, hue) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<circle cx="100" cy="100" r="100" fill="hsl(${hue}, 45%, 42%)"/>
<circle cx="100" cy="100" r="94" fill="hsl(${hue}, 38%, 36%)"/>
<text x="100" y="118" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="64" font-weight="600">${initials}</text>
</svg>`;

const posts = [
  ['post-sparvergleich', 'SPARVERGLEICH', '50+ EU-Banken', '#1e3a5f', 'dots'],
  ['post-einlage', 'EINLAGE', 'Sicher in der EU', '#134e4a', 'lines'],
  ['post-bonus', 'BONUS', 'bis 300 €', '#7c2d12', 'dots'],
  ['post-zinsen', 'ZINSEN', 'aktuell vergleichen', '#4c1d95', 'lines'],
  ['post-tagesgeld', 'TAGESGELD', 'flexibel anlegen', '#0c4a6e', 'dots'],
  ['post-flexgeld', 'FLEXGELD', 'Kombi aus Tages- & Fest', '#3f6212', 'lines'],
  ['post-frankfurt', 'FRANKFURT', 'Team vor Ort', '#374151', 'dots'],
  ['post-team', 'TEAM', 'persönliche Beratung', '#831843', 'lines'],
  ['post-europa', 'EUROPA', 'Partnernetzwerk', '#1e40af', 'dots'],
];

posts.forEach(([id, title, sub, accent, pat]) => {
  fs.writeFileSync(path.join(base, `posts/${id}.svg`), squarePost(title, sub, accent, pat));
});

[
  ['sparvergleich', 'Spar'],
  ['zinsen', 'Zinsen'],
  ['sicherheit', 'Sicher'],
  ['team', 'Team'],
  ['faq', 'FAQ'],
].forEach(([id, label]) => {
  fs.writeFileSync(path.join(base, `highlights/${id}.svg`), highlightCover(label));
});

const stories = {
  sparvergleich: [
    ['Vergleich', 'Tagesgeld, Flexgeld & Festgeld auf einen Blick.'],
    ['Filter', 'Nach Laufzeit und Mindestanlage sortieren.'],
  ],
  zinsen: [
    ['Zinsen', 'Aktuelle Konditionen der Partnerbanken.'],
    ['Rechner', 'Szenarien auf kapitalmitte.com testen.'],
  ],
  sicherheit: [
    ['Einlage', 'Gesetzlicher Schutz in der EU erklärt.'],
    ['Transparenz', 'Kein Kundengeld bei Kapitalmitte.'],
  ],
  team: [
    ['Frankfurt', 'Persönliche Betreuung aus dem Büro.'],
    ['Kontakt', 'E-Mail & Telefon auf der Website.'],
  ],
  faq: [
    ['FAQ', 'Häufige Fragen zum Sparvergleich.'],
    ['Bonus', 'Bedingungen je Partnerbank.'],
  ],
};

Object.entries(stories).forEach(([highlightId, slides]) => {
  slides.forEach(([headline, body], i) => {
    const file = path.join(base, `stories/${highlightId}-${i + 1}.svg`);
    if (highlightId === 'sparvergleich' && i === 0 && fs.existsSync(file)) return;
    fs.writeFileSync(file, storySlide(headline, body));
  });
});

const avatars = [
  ['lena-hartmann', 'LH', 12],
  ['markus-schneider', 'MS', 28],
  ['kristin-neumann', 'KN', 340],
  ['florian-kessler', 'FK', 200],
  ['mira-soldan', 'MS', 310],
  ['tobias-jenisch', 'TJ', 45],
  ['sabine-wolff', 'SW', 15],
  ['viktor-pohl', 'VP', 220],
  ['andrea-fuchs', 'AF', 350],
  ['jonas-werth', 'JW', 180],
];

avatars.forEach(([slug, initials, hue]) => {
  fs.writeFileSync(path.join(base, `avatars/comments/${slug}.svg`), commentAvatar(initials, hue));
});

console.log('Instagram assets written to', base);
