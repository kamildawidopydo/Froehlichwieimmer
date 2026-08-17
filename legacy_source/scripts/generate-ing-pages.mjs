/**
 * One-off: copy BBVA formular pages → ING Netherlands (run from repo root).
 * node scripts/generate-ing-pages.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

const TEXT_REPLACEMENTS = [
  ['BBVAFestgeldDocs', 'IngFestgeldDocs'],
  ['BBVAFlexgeldDocs', 'IngFlexgeldDocs'],
  ['BBVAFestgeldBedingungen', 'IngFestgeldBedingungen'],
  ['BBVAFlexgeldBedingungen', 'IngFlexgeldBedingungen'],
  ['BBVAFestgeldProduktinfo', 'IngFestgeldProduktinfo'],
  ['BBVAFlexgeldProduktinfo', 'IngFlexgeldProduktinfo'],
  ['BBVAFestgeldVertrag', 'IngFestgeldVertrag'],
  ['/banks/bbva/', '/banks/ing/'],
  ['bbva-doc-root', 'ing-doc-root'],
  ['#072146', '#003087'],
  ['#1a3a6b', '#003087'],
  ['#0A2540', '#003087'],
  ['#2c4a6e', '#0046AD'],
  ['#0078d4', '#FF6200'],
  ['#4da3e8', '#FF8533'],
  ['#f0f3f8', '#FFF5F0'],
  ['#e8eef5', '#FFE8D9'],
  ['#eef2f7', '#FFF0E8'],
  ['#f0f4fa', '#FFF8F4'],
  ['/assets/bank-logos/bbva-logo-white.png', '/assets/bank-logos/ing-logo.png'],
  [
    'Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland, Neue Mainzer Str. 28, 60311 Frankfurt am Main, eingetragen im Handelsregister des Amtsgerichts Frankfurt am Main unter HRB 81939.',
    'ING B.V., Bijlmerplein 888, 1102 MG Amsterdam, Niederlande, eingetragen im Handelsregister der Kamer van Koophandel unter KvK-Nummer 33031431.',
  ],
  [
    'Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland, Neue Mainzer Str. 28, 60311 Frankfurt am\n            Main, eingetragen im Handelsregister des Amtsgerichts Frankfurt am Main unter HRB 81939.',
    'ING B.V., Bijlmerplein 888, 1102 MG Amsterdam, Niederlande, eingetragen im Handelsregister der Kamer van Koophandel unter KvK-Nummer 33031431.',
  ],
  [
    'Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland · Neue Mainzer Str. 28 · 60311 Frankfurt am Main · HRB 81939',
    'ING B.V. · Bijlmerplein 888 · 1102 MG Amsterdam · KvK 33031431',
  ],
  [
    'Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland<br />Neue Mainzer Str. 28, 60311 Frankfurt am Main',
    'ING B.V.<br />Bijlmerplein 888, 1102 MG Amsterdam, Niederlande',
  ],
  ['Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland', 'ING B.V.'],
  ['Banco Bilbao Vizcaya Argentaria, S.A. · Niederlassung Deutschland', 'ING B.V. · Amsterdam'],
  ['BBVA Deutschland', 'ING B.V.'],
  ['bei der BBVA', 'bei der ING'],
  ['der BBVA über', 'der ING über'],
  ['ist die BBVA verpflichtet', 'ist die ING verpflichtet'],
  ['Aufnahmebestätigung der BBVA', 'Aufnahmebestätigung der ING'],
  ['Unterschrift | BBVA', 'Unterschrift | ING'],
  ['www.bbva.de/allgemein/datenschutz', 'www.ing.nl/privacy'],
  ['Frankfurt am Main, soweit gesetzlich zulässig', 'Amsterdam, soweit gesetzlich zulässig'],
  ['alt="BBVA"', 'alt="ING"'],
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
const ingDir = path.join(root, 'src/pages/ing');
fs.mkdirSync(ingDir, { recursive: true });

for (const file of fs.readdirSync(bbvaDir)) {
  if (!file.endsWith('.js')) continue;
  const src = fs.readFileSync(path.join(bbvaDir, file), 'utf8');
  const outName = file.replace(/^BBVA/, 'Ing');
  fs.writeFileSync(path.join(ingDir, outName), transform(src));
  console.log('wrote', outName);
}

const vertragPath = path.join(ingDir, 'IngFestgeldVertrag.js');
let vertrag = fs.readFileSync(vertragPath, 'utf8');
vertrag = vertrag
  .replace("from '@/lib/generateFestgeldPdf'", "from '@/lib/generateIngFestgeldPdf'")
  .replace(/generateFestgeldPdf/g, 'generateIngFestgeldPdf')
  .replace(/prepareBbvaFestgeldPdfData/g, 'prepareIngFestgeldPdfData')
  .replace(/prepareBbvaPdfData/g, 'prepareIngFestgeldPdfData')
  .replace(/BBVA_FESTGELD_CONDITIONS/g, 'ING_FESTGELD_CONDITIONS')
  .replace("useFormularConditions('bbva'", "useFormularConditions('ing'")
  .replace('/api/send-festgeld-email', '/api/send-ing-festgeld-email');
fs.writeFileSync(vertragPath, vertrag);

const formSrc = fs.readFileSync(path.join(root, 'src/pages/BBVAContractForm.js'), 'utf8');
let formOut = transform(formSrc)
  .replace(/BBVAContractForm/g, 'IngContractForm')
  .replace("from '@/lib/generateContractPdf'", "from '@/lib/generateIngContractPdf'")
  .replace(/generateContractPdf/g, 'generateIngContractPdf')
  .replace(/prepareBbvaPdfData/g, 'prepareIngPdfData')
  .replace(/BBVA_FLEXGELD_CONDITIONS/g, 'ING_FLEXGELD_CONDITIONS')
  .replace("useFormularConditions('bbva'", "useFormularConditions('ing'")
  .replace('/api/send-contract-email', '/api/send-ing-contract-email');
fs.writeFileSync(path.join(root, 'src/pages/IngContractForm.js'), formOut);
console.log('wrote IngContractForm.js');

console.log('done');
