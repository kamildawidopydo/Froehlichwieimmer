/**
 * One-off: copy BBVA formular pages → Postbank (run from repo root).
 * node scripts/generate-postbank-pages.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

const TEXT_REPLACEMENTS = [
  ['BBVAFestgeldDocs', 'PostbankFestgeldDocs'],
  ['BBVAFlexgeldDocs', 'PostbankFlexgeldDocs'],
  ['BBVAFestgeldBedingungen', 'PostbankFestgeldBedingungen'],
  ['BBVAFlexgeldBedingungen', 'PostbankFlexgeldBedingungen'],
  ['BBVAFestgeldProduktinfo', 'PostbankFestgeldProduktinfo'],
  ['BBVAFlexgeldProduktinfo', 'PostbankFlexgeldProduktinfo'],
  ['BBVAFestgeldVertrag', 'PostbankFestgeldVertrag'],
  ['/banks/bbva/', '/banks/postbank/'],
  ['bbva-doc-root', 'postbank-doc-root'],
  ['#072146', '#003366'],
  ['#1a3a6b', '#003366'],
  ['#0A2540', '#003366'],
  ['#2c4a6e', '#004080'],
  ['#f0f3f8', '#f5f5f0'],
  ['/assets/bank-logos/bbva-logo-white.png', '/assets/bank-logos/postbank-wordmark-yellow.svg'],
  ['Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland, Neue Mainzer Str. 28, 60311 Frankfurt am Main, eingetragen im Handelsregister des Amtsgerichts Frankfurt am Main unter HRB 81939.', 'Deutsche Postbank AG, Otto-Suhr-Allee 4-6, 10557 Berlin, eingetragen im Handelsregister des Amtsgerichts Charlottenburg unter HRB 6794.'],
  ['Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland, Neue Mainzer Str. 28, 60311 Frankfurt am\n            Main, eingetragen im Handelsregister des Amtsgerichts Frankfurt am Main unter HRB 81939.', 'Deutsche Postbank AG, Otto-Suhr-Allee 4-6, 10557 Berlin, eingetragen im Handelsregister des Amtsgerichts Charlottenburg unter HRB 6794.'],
  ['Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland · Neue Mainzer Str. 28 · 60311 Frankfurt am Main · HRB 81939', 'Deutsche Postbank AG · Otto-Suhr-Allee 4-6 · 10557 Berlin · HRB 6794'],
  ['Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland<br />Neue Mainzer Str. 28, 60311 Frankfurt am Main', 'Deutsche Postbank AG<br />Otto-Suhr-Allee 4-6, 10557 Berlin'],
  ['Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland', 'Deutsche Postbank AG'],
  ['Banco Bilbao Vizcaya Argentaria, S.A. · Niederlassung Deutschland', 'Deutsche Postbank AG'],
  ['BBVA Deutschland', 'Postbank'],
  ['bei der BBVA', 'bei der Postbank'],
  ['der BBVA über', 'der Postbank über'],
  ['ist die BBVA verpflichtet', 'ist die Postbank verpflichtet'],
  ['Aufnahmebestätigung der Postbank', 'Aufnahmebestätigung der Postbank'],
  ['Unterschrift | Postbank', 'Unterschrift | Postbank'],
  ['www.bbva.de/allgemein/datenschutz', 'www.postbank.de/datenschutz'],
  ['Frankfurt am Main, soweit gesetzlich zulässig', 'Berlin, soweit gesetzlich zulässig'],
  ['alt="BBVA"', 'alt="Postbank"'],
  ['FGD ES', 'Deutsche Einlagensicherung'],
  ['spanischen Einlagensicherungsfonds', 'Deutschen Einlagensicherungssystem'],
  ['spanische Einlagensicherung', 'Deutsche Einlagensicherung'],
];

function transform(content) {
  let out = content;
  for (const [from, to] of TEXT_REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
}

const bbvaDir = path.join(root, 'src/pages/bbva');
const postbankDir = path.join(root, 'src/pages/postbank');
fs.mkdirSync(postbankDir, { recursive: true });

for (const file of fs.readdirSync(bbvaDir)) {
  if (!file.endsWith('.js')) continue;
  const src = fs.readFileSync(path.join(bbvaDir, file), 'utf8');
  const outName = file.replace(/^BBVA/, 'Postbank');
  fs.writeFileSync(path.join(postbankDir, outName), transform(src));
  console.log('wrote', outName);
}

// FestgeldVertrag: fix imports
const vertragPath = path.join(postbankDir, 'PostbankFestgeldVertrag.js');
let vertrag = fs.readFileSync(vertragPath, 'utf8');
vertrag = vertrag
  .replace("from '@/lib/generateFestgeldPdf'", "from '@/lib/generatePostbankFestgeldPdf'")
  .replace('generateFestgeldPdf', 'generatePostbankFestgeldPdf')
  .replace('prepareBbvaPdfData', 'preparePostbankPdfData')
  .replace("from '@/lib/contractAddress'", "from '@/lib/contractAddress'")
  .replace('/api/send-festgeld-email', '/api/send-postbank-festgeld-email');
if (!vertrag.includes('preparePostbankPdfData')) {
  vertrag = vertrag.replace(
    /prepareBbvaPdfData/g,
    'preparePostbankPdfData',
  );
}
fs.writeFileSync(vertragPath, vertrag);

// Contract form from BBVAContractForm
const formSrc = fs.readFileSync(path.join(root, 'src/pages/BBVAContractForm.js'), 'utf8');
let formOut = transform(formSrc)
  .replace(/BBVAContractForm/g, 'PostbankContractForm')
  .replace("from '@/lib/generateContractPdf'", "from '@/lib/generatePostbankContractPdf'")
  .replace('generateContractPdf', 'generatePostbankContractPdf')
  .replace('prepareBbvaPdfData', 'preparePostbankPdfData')
  .replace('BBVA_FLEXGELD_CONDITIONS', 'POSTBANK_FLEXGELD_CONDITIONS')
  .replace('/api/send-contract-email', '/api/send-postbank-contract-email');
fs.writeFileSync(path.join(root, 'src/pages/PostbankContractForm.js'), formOut);
console.log('wrote PostbankContractForm.js');

console.log('done');
