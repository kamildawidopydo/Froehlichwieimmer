/**
 * One-off: copy BBVA formular pages → bunq Netherlands (run from repo root).
 * node scripts/generate-bunq-pages.mjs
 *
 * Writes into src/pages/bunq/ (overwrites legacy BunqDocs/VertragForm/Produktinfo naming
 * with BBVA-style Festgeld/Flexgeld pages). Legacy files are removed after generation.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

const TEXT_REPLACEMENTS = [
  ['BBVAFestgeldDocs', 'BunqFestgeldDocs'],
  ['BBVAFlexgeldDocs', 'BunqFlexgeldDocs'],
  ['BBVAFestgeldBedingungen', 'BunqFestgeldBedingungen'],
  ['BBVAFlexgeldBedingungen', 'BunqFlexgeldBedingungen'],
  ['BBVAFestgeldProduktinfo', 'BunqFestgeldProduktinfo'],
  ['BBVAFlexgeldProduktinfo', 'BunqFlexgeldProduktinfo'],
  ['BBVAFestgeldVertrag', 'BunqFestgeldVertrag'],
  ['/banks/bbva/', '/banks/bunq/'],
  ['bbva-doc-root', 'bunq-doc-root'],
  ['#072146', '#0B4F6C'],
  ['#1a3a6b', '#0B4F6C'],
  ['#0A2540', '#0B4F6C'],
  ['#2c4a6e', '#0E6E8C'],
  ['#0078d4', '#FF7819'],
  ['#4da3e8', '#FF9A4D'],
  ['#f0f3f8', '#F2F8FA'],
  ['#e8eef5', '#E5F2F6'],
  ['#eef2f7', '#EAF5F8'],
  ['#f0f4fa', '#F5FAFC'],
  ['/assets/bank-logos/bbva-logo-white.png', '/assets/bank-logos/bunq-logo.png'],
  [
    'Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland, Neue Mainzer Str. 28, 60311 Frankfurt am Main, eingetragen im Handelsregister des Amtsgerichts Frankfurt am Main unter HRB 81939.',
    'bunq B.V., Naritaweg 131–133, 1043 BS Amsterdam, Niederlande, eingetragen im Handelsregister der Kamer van Koophandel unter KvK-Nummer 54992060.',
  ],
  [
    'Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland, Neue Mainzer Str. 28, 60311 Frankfurt am\n            Main, eingetragen im Handelsregister des Amtsgerichts Frankfurt am Main unter HRB 81939.',
    'bunq B.V., Naritaweg 131–133, 1043 BS Amsterdam, Niederlande, eingetragen im Handelsregister der Kamer van Koophandel unter KvK-Nummer 54992060.',
  ],
  [
    'Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland · Neue Mainzer Str. 28 · 60311 Frankfurt am Main · HRB 81939',
    'bunq B.V. · Naritaweg 131–133 · 1043 BS Amsterdam · KvK 54992060',
  ],
  [
    'Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland<br />Neue Mainzer Str. 28, 60311 Frankfurt am Main',
    'bunq B.V.<br />Naritaweg 131–133, 1043 BS Amsterdam, Niederlande',
  ],
  ['Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland', 'bunq B.V.'],
  ['Banco Bilbao Vizcaya Argentaria, S.A. · Niederlassung Deutschland', 'bunq B.V. · Amsterdam'],
  ['BBVA Deutschland', 'bunq B.V.'],
  ['bei der BBVA', 'bei der bunq'],
  ['der BBVA über', 'der bunq über'],
  ['ist die BBVA verpflichtet', 'ist die bunq verpflichtet'],
  ['Aufnahmebestätigung der BBVA', 'Aufnahmebestätigung der bunq'],
  ['Unterschrift | BBVA', 'Unterschrift | bunq'],
  ['www.bbva.de/allgemein/datenschutz', 'www.bunq.com/privacy'],
  ['Frankfurt am Main, soweit gesetzlich zulässig', 'Amsterdam, soweit gesetzlich zulässig'],
  ['alt="BBVA"', 'alt="bunq"'],
  ['FGD ES', 'DGS NL'],
  ['spanischen Einlagensicherungsfonds', 'niederländischen Einlagensicherungssystem (DGS)'],
  ['spanische Einlagensicherung', 'niederländische Einlagensicherung (DGS)'],
  ['des spanischen', 'des niederländischen'],
];

function transform(content) {
  let out = content;
  for (const [from, to] of TEXT_REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
}

const bbvaDir = path.join(root, 'src/pages/bbva');
const bunqDir = path.join(root, 'src/pages/bunq');
fs.mkdirSync(bunqDir, { recursive: true });

// Remove legacy single-product bunq pages
for (const legacy of ['BunqDocs.js', 'BunqProduktinfo.js', 'BunqVertragForm.js']) {
  const p = path.join(bunqDir, legacy);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log('removed legacy', legacy);
  }
}

for (const file of fs.readdirSync(bbvaDir)) {
  if (!file.endsWith('.js')) continue;
  const src = fs.readFileSync(path.join(bbvaDir, file), 'utf8');
  const outName = file.replace(/^BBVA/, 'Bunq');
  fs.writeFileSync(path.join(bunqDir, outName), transform(src));
  console.log('wrote', outName);
}

const vertragPath = path.join(bunqDir, 'BunqFestgeldVertrag.js');
let vertrag = fs.readFileSync(vertragPath, 'utf8');
vertrag = vertrag
  .replace("from '@/lib/generateFestgeldPdf'", "from '@/lib/generateBunqFestgeldPdf'")
  .replace(/generateFestgeldPdf/g, 'generateBunqFestgeldPdf')
  .replace(/prepareBbvaFestgeldPdfData/g, 'prepareBunqFestgeldPdfData')
  .replace(/prepareBbvaPdfData/g, 'prepareBunqFestgeldPdfData')
  .replace(/BBVA_FESTGELD_CONDITIONS/g, 'BUNQ_FESTGELD_CONDITIONS')
  .replace("useFormularConditions('bbva'", "useFormularConditions('bunq'")
  .replace('/api/send-festgeld-email', '/api/send-bunq-festgeld-email');
fs.writeFileSync(vertragPath, vertrag);

const formSrc = fs.readFileSync(path.join(root, 'src/pages/BBVAContractForm.js'), 'utf8');
let formOut = transform(formSrc)
  .replace(/BBVAContractForm/g, 'BunqContractForm')
  .replace("from '@/lib/generateContractPdf'", "from '@/lib/generateBunqContractPdf'")
  .replace(/generateContractPdf/g, 'generateBunqContractPdf')
  .replace(/prepareBbvaPdfData/g, 'prepareBunqPdfData')
  .replace(/BBVA_FLEXGELD_CONDITIONS/g, 'BUNQ_FLEXGELD_CONDITIONS')
  .replace("useFormularConditions('bbva'", "useFormularConditions('bunq'")
  .replace('/api/send-contract-email', '/api/send-bunq-contract-email');
fs.writeFileSync(path.join(root, 'src/pages/BunqContractForm.js'), formOut);
console.log('wrote BunqContractForm.js');

console.log('done');
