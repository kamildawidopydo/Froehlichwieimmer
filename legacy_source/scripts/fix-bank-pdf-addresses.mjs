/**
 * Fix leftover BBVA footer/address lines in cloned bank PDF libs + pages.
 * node scripts/fix-bank-pdf-addresses.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

const BBVA_FOOTER_ESC =
  'Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland \\u00B7 Neue Mainzer Str. 28 \\u00B7 60311 Frankfurt am Main \\u00B7 HRB 81939';
const BBVA_FOOTER_MID =
  'Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland · Neue Mainzer Str. 28 · 60311 Frankfurt am Main · HRB 81939';
const BBVA_PARTNER =
  'verschiedenen Produkte in EUR unserer Partnerbank: Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung';

const FIXES = [
  {
    files: [
      'src/lib/generateIngContractPdf.js',
      'src/lib/generateIngFestgeldPdf.js',
    ],
    footerEsc: 'ING B.V. \\u00B7 Bijlmerplein 888 \\u00B7 1102 MG Amsterdam \\u00B7 KvK 33031431',
    footerMid: 'ING B.V. · Bijlmerplein 888 · 1102 MG Amsterdam · KvK 33031431',
    gericht: ['Frankfurt am Main, soweit gesetzlich zul\\u00E4ssig', 'Amsterdam, soweit gesetzlich zul\\u00E4ssig'],
    gerichtPlain: ['Frankfurt am Main, soweit gesetzlich zulässig', 'Amsterdam, soweit gesetzlich zulässig'],
  },
  {
    files: [
      'src/lib/generateBunqContractPdf.js',
      'src/lib/generateBunqFestgeldPdf.js',
    ],
    footerEsc: 'bunq B.V. \\u00B7 Naritaweg 131\\u2013133 \\u00B7 1043 BS Amsterdam \\u00B7 KvK 54992060',
    footerMid: 'bunq B.V. · Naritaweg 131–133 · 1043 BS Amsterdam · KvK 54992060',
    gericht: ['Frankfurt am Main, soweit gesetzlich zul\\u00E4ssig', 'Amsterdam, soweit gesetzlich zul\\u00E4ssig'],
    gerichtPlain: ['Frankfurt am Main, soweit gesetzlich zulässig', 'Amsterdam, soweit gesetzlich zulässig'],
  },
  {
    files: [
      'src/lib/generateBunqDeContractPdf.js',
      'src/lib/generateBunqDeFestgeldPdf.js',
    ],
    footerEsc: 'bunq B.V. \\u00B7 Naritaweg 131\\u2013133 \\u00B7 1043 BS Amsterdam \\u00B7 KvK 54992060 \\u00B7 Angebot Deutschland',
    footerMid: 'bunq B.V. · Naritaweg 131–133 · 1043 BS Amsterdam · KvK 54992060 · Angebot Deutschland',
    gericht: ['Frankfurt am Main, soweit gesetzlich zul\\u00E4ssig', 'Amsterdam, soweit gesetzlich zul\\u00E4ssig'],
    gerichtPlain: ['Frankfurt am Main, soweit gesetzlich zulässig', 'Amsterdam, soweit gesetzlich zulässig'],
  },
];

const PAGE_PARTNER_FIXES = [
  {
    files: [
      'src/pages/ing/IngFestgeldProduktinfo.js',
      'src/pages/ing/IngFlexgeldProduktinfo.js',
    ],
    from: BBVA_PARTNER,
    to: 'verschiedenen Produkte in EUR unserer Partnerbank: ING B.V.',
  },
  {
    files: [
      'src/pages/bunq/BunqFestgeldProduktinfo.js',
      'src/pages/bunq/BunqFlexgeldProduktinfo.js',
    ],
    from: BBVA_PARTNER,
    to: 'verschiedenen Produkte in EUR unserer Partnerbank: bunq B.V.',
  },
  {
    files: [
      'src/pages/bunq-de/BunqDeFestgeldProduktinfo.js',
      'src/pages/bunq-de/BunqDeFlexgeldProduktinfo.js',
    ],
    from: BBVA_PARTNER,
    to: 'verschiedenen Produkte in EUR unserer Partnerbank: bunq B.V. (Angebot Deutschland)',
  },
];

function patchFile(rel, replacements) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.warn('missing', rel);
    return;
  }
  let s = fs.readFileSync(file, 'utf8');
  const before = s;
  for (const [from, to] of replacements) {
    if (!from) continue;
    s = s.split(from).join(to);
  }
  if (s !== before) {
    fs.writeFileSync(file, s);
    console.log('updated', rel);
  } else {
    console.log('unchanged', rel);
  }
}

for (const fix of FIXES) {
  for (const rel of fix.files) {
    patchFile(rel, [
      [BBVA_FOOTER_ESC, fix.footerEsc],
      [BBVA_FOOTER_MID, fix.footerMid],
      fix.gericht,
      fix.gerichtPlain,
    ]);
  }
}

for (const fix of PAGE_PARTNER_FIXES) {
  for (const rel of fix.files) {
    patchFile(rel, [[fix.from, fix.to]]);
  }
}

// Also fix form page footers if any still have BBVA address on non-BBVA banks
const FORM_FOOTER_CHECKS = [
  ['src/pages/IngContractForm.js', BBVA_FOOTER_MID, 'ING B.V. · Bijlmerplein 888 · 1102 MG Amsterdam · KvK 33031431'],
  ['src/pages/ing/IngFestgeldVertrag.js', BBVA_FOOTER_MID, 'ING B.V. · Bijlmerplein 888 · 1102 MG Amsterdam · KvK 33031431'],
  ['src/pages/BunqContractForm.js', BBVA_FOOTER_MID, 'bunq B.V. · Naritaweg 131–133 · 1043 BS Amsterdam · KvK 54992060'],
  ['src/pages/bunq/BunqFestgeldVertrag.js', BBVA_FOOTER_MID, 'bunq B.V. · Naritaweg 131–133 · 1043 BS Amsterdam · KvK 54992060'],
  ['src/pages/BunqDeContractForm.js', BBVA_FOOTER_MID, 'bunq B.V. · Naritaweg 131–133 · 1043 BS Amsterdam · KvK 54992060 · Angebot Deutschland'],
  ['src/pages/bunq-de/BunqDeFestgeldVertrag.js', BBVA_FOOTER_MID, 'bunq B.V. · Naritaweg 131–133 · 1043 BS Amsterdam · KvK 54992060 · Angebot Deutschland'],
];

for (const [rel, from, to] of FORM_FOOTER_CHECKS) {
  patchFile(rel, [[from, to]]);
}

console.log('done');
