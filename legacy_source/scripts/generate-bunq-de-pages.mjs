/**
 * Clone bunq NL formular → bunq Deutschland (keeps NL intact).
 * node scripts/generate-bunq-de-pages.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

const TEXT_REPLACEMENTS = [
  ['BunqFestgeldDocs', 'BunqDeFestgeldDocs'],
  ['BunqFlexgeldDocs', 'BunqDeFlexgeldDocs'],
  ['BunqFestgeldBedingungen', 'BunqDeFestgeldBedingungen'],
  ['BunqFlexgeldBedingungen', 'BunqDeFlexgeldBedingungen'],
  ['BunqFestgeldProduktinfo', 'BunqDeFestgeldProduktinfo'],
  ['BunqFlexgeldProduktinfo', 'BunqDeFlexgeldProduktinfo'],
  ['BunqFestgeldVertrag', 'BunqDeFestgeldVertrag'],
  ['BunqContractForm', 'BunqDeContractForm'],
  ['/banks/bunq/', '/banks/bunq-de/'],
  ['bunq-doc-root', 'bunq-de-doc-root'],
  ["from '@/components/bunq/BunqContractHeader'", "from '@/components/bunq-de/BunqDeContractHeader'"],
  ["from '@/lib/bunqTheme'", "from '@/lib/bunqDeTheme'"],
  ['BunqContractHeader', 'BunqDeContractHeader'],
  ['BunqContractIntro', 'BunqDeContractIntro'],
  ['generateBunqFestgeldPdf', 'generateBunqDeFestgeldPdf'],
  ['generateBunqContractPdf', 'generateBunqDeContractPdf'],
  ['prepareBunqFestgeldPdfData', 'prepareBunqDeFestgeldPdfData'],
  ['prepareBunqPdfData', 'prepareBunqDePdfData'],
  ['BUNQ_FESTGELD_CONDITIONS', 'BUNQ_DE_FESTGELD_CONDITIONS'],
  ['BUNQ_FLEXGELD_CONDITIONS', 'BUNQ_DE_FLEXGELD_CONDITIONS'],
  ["useFormularConditions('bunq'", "useFormularConditions('bunq-de'"],
  ['/api/send-bunq-festgeld-email', '/api/send-bunq-de-festgeld-email'],
  ['/api/send-bunq-contract-email', '/api/send-bunq-de-contract-email'],
  // Market-facing NL → DE (keep legal KvK / Amsterdam entity)
  ['>Niederlande</p>', '>Deutschland</p>'],
  ['· Amsterdam</p>', '· Deutschland</p>'],
  ['Amsterdam · Niederlande', 'Deutschland'],
  // Accent tweak vs NL teal: darker charcoal primary for DE
  ['#0B4F6C', '#1C1C1C'],
  ['#0E6E8C', '#333333'],
  ['#F2F8FA', '#F7F7F7'],
  ['#E5F2F6', '#EFEFEF'],
  ['#EAF5F8', '#F2F2F2'],
  ['#F5FAFC', '#FAFAFA'],
];

function transform(content) {
  let out = content;
  for (const [from, to] of TEXT_REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
}

const srcDir = path.join(root, 'src/pages/bunq');
const destDir = path.join(root, 'src/pages/bunq-de');
fs.mkdirSync(destDir, { recursive: true });

for (const file of fs.readdirSync(srcDir)) {
  if (!file.endsWith('.js')) continue;
  const src = fs.readFileSync(path.join(srcDir, file), 'utf8');
  const outName = file.replace(/^Bunq/, 'BunqDe');
  fs.writeFileSync(path.join(destDir, outName), transform(src));
  console.log('wrote', outName);
}

const formSrc = fs.readFileSync(path.join(root, 'src/pages/BunqContractForm.js'), 'utf8');
fs.writeFileSync(path.join(root, 'src/pages/BunqDeContractForm.js'), transform(formSrc));
console.log('wrote BunqDeContractForm.js');

// Header component
const headerSrc = fs.readFileSync(path.join(root, 'src/components/bunq/BunqContractHeader.js'), 'utf8');
const headerDir = path.join(root, 'src/components/bunq-de');
fs.mkdirSync(headerDir, { recursive: true });
fs.writeFileSync(path.join(headerDir, 'BunqDeContractHeader.js'), transform(headerSrc));
console.log('wrote BunqDeContractHeader.js');

console.log('done');
