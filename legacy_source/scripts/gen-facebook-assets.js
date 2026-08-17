const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '../public/assets/social/facebook');
['posts', 'photos'].forEach((d) => fs.mkdirSync(path.join(base, d), { recursive: true }));

const cover = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0A2540"/><stop offset="100%" stop-color="#1a4a7a"/></linearGradient></defs><rect width="1200" height="400" fill="url(#g)"/><text x="1050" y="370" text-anchor="end" fill="rgba(255,255,255,0.35)" font-family="system-ui" font-size="14">Alexander Wahl Vermögensverwaltung GmbH</text></svg>`;

const avatar = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="100" fill="#0A2540"/><text x="100" y="118" text-anchor="middle" fill="#D4AF37" font-family="Georgia,serif" font-size="52" font-weight="300">BR</text></svg>`;

const post = (title, sub, color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><rect width="800" height="450" fill="#f0f2f5"/><rect x="40" y="40" width="720" height="370" rx="12" fill="#fff" stroke="#dddfe2"/><text x="400" y="200" text-anchor="middle" fill="${color}" font-family="system-ui" font-size="36" font-weight="700">${title}</text><text x="400" y="250" text-anchor="middle" fill="#65676b" font-family="system-ui" font-size="18">${sub}</text><text x="60" y="70" fill="#0A2540" font-family="system-ui" font-size="14" font-weight="600">KAPITALMITTE</text></svg>`;

fs.writeFileSync(path.join(base, 'cover.svg'), cover);
fs.writeFileSync(path.join(base, 'page-avatar.svg'), avatar);
fs.writeFileSync(path.join(base, 'posts/sparvergleich.svg'), post('EU-SPARVERGLEICH', '50+ Partnerbanken', '#1877F2'));
fs.writeFileSync(path.join(base, 'posts/einlagensicherung.svg'), post('EINLAGENSICHERUNG', 'Schutz in der EU', '#0A2540'));
fs.writeFileSync(path.join(base, 'posts/bonus.svg'), post('BIS ZU 300 €', 'Willkommensbonus', '#2d6a4f'));
fs.writeFileSync(path.join(base, 'posts/zinsrechner.svg'), post('ZINSRECHNER', 'Szenarien berechnen', '#7c3aed'));

const labels = ['Partnerbanken', 'Zinsen', 'Frankfurt', 'Tagesgeld', 'Flexgeld', 'Festgeld', 'Sicherheit', 'Europa', 'Team'];
labels.forEach((label, i) => {
  fs.writeFileSync(path.join(base, `photos/photo-${i + 1}.svg`), post(label, 'Kapitalmitte', '#1877F2'));
});

console.log('Facebook assets written to', base);
