/**
 * Generate bunq DE PDF libs from bunq NL sources.
 * node scripts/generate-bunq-de-pdf-libs.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

const PDF_REPLACEMENTS = [
  ['generateBunqContractPdf', 'generateBunqDeContractPdf'],
  ['generateBunqFestgeldPdf', 'generateBunqDeFestgeldPdf'],
  ['drawBunqPdfPage1Header', 'drawBunqDePdfPage1Header'],
  ['drawBunqPdfContinuationHeader', 'drawBunqDePdfContinuationHeader'],
  ['embedBunqLogo', 'embedBunqDeLogo'],
  ["from './embedBunqPdfHeader'", "from './embedBunqDePdfHeader'"],
  ['BNQ-', 'BNQD-'],
  [
    'bunq B.V. \\u00B7 Naritaweg 131\\u2013133 \\u00B7 1043 BS Amsterdam \\u00B7 KvK 54992060',
    'bunq B.V. \\u00B7 Naritaweg 131\\u2013133 \\u00B7 1043 BS Amsterdam \\u00B7 KvK 54992060 \\u00B7 Angebot Deutschland',
  ],
  [
    'bunq B.V. \u00B7 Naritaweg 131\u2013133 \u00B7 1043 BS Amsterdam \u00B7 KvK 54992060',
    'bunq B.V. \u00B7 Naritaweg 131\u2013133 \u00B7 1043 BS Amsterdam \u00B7 KvK 54992060 \u00B7 Angebot Deutschland',
  ],
  ['getBunqLogoPngBytes', 'getBunqLogoPngBytes'], // same logo bytes
  // DE charcoal instead of NL teal in RGB headers (pdf generators use local NAVY const)
  ['rgb(11/255, 79/255, 108/255)', 'rgb(28/255, 28/255, 28/255)'],
  ['rgb(242/255, 248/255, 250/255)', 'rgb(247/255, 247/255, 247/255)'],
  ['rgb(245/255, 250/255, 252/255)', 'rgb(250/255, 250/255, 250/255)'],
  ['rgb(229/255, 242/255, 246/255)', 'rgb(239/255, 239/255, 239/255)'],
  ['rgb(250/255, 252/255, 253/255)', 'rgb(252/255, 252/255, 252/255)'],
  ['bunqLogo', 'bunqDeLogo'],
];

function transform(content) {
  let out = content;
  for (const [from, to] of PDF_REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
}

fs.writeFileSync(
  path.join(root, 'src/lib/generateBunqDeContractPdf.js'),
  transform(fs.readFileSync(path.join(root, 'src/lib/generateBunqContractPdf.js'), 'utf8')),
);
fs.writeFileSync(
  path.join(root, 'src/lib/generateBunqDeFestgeldPdf.js'),
  transform(fs.readFileSync(path.join(root, 'src/lib/generateBunqFestgeldPdf.js'), 'utf8')),
);

console.log('wrote generateBunqDeContractPdf.js and generateBunqDeFestgeldPdf.js');
