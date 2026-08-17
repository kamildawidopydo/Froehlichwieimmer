/**
 * Generate bunq PDF libs from BBVA sources.
 * node scripts/generate-bunq-pdf-libs.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

const PDF_REPLACEMENTS = [
  ['generateContractPdf', 'generateBunqContractPdf'],
  ['generateFestgeldPdf', 'generateBunqFestgeldPdf'],
  ['drawBbvaPdfPage1Header', 'drawBunqPdfPage1Header'],
  ['drawBbvaPdfContinuationHeader', 'drawBunqPdfContinuationHeader'],
  ['embedBbvaLogo', 'embedBunqLogo'],
  ["from './embedBbvaPdfHeader'", "from './embedBunqPdfHeader'"],
  ['BBV-', 'BNQ-'],
  ['BBVA Deutschland', 'bunq B.V.'],
  ['der BBVA ', 'der bunq '],
  ['bei der BBVA ', 'bei der bunq '],
  ['www.bbva.de/allgemein/datenschutz', 'www.bunq.com/privacy'],
  ['Frankfurt am Main, soweit gesetzlich zul\\u00E4ssig', 'Amsterdam, soweit gesetzlich zul\\u00E4ssig'],
  ['Frankfurt am Main, soweit gesetzlich zul\u00E4ssig', 'Amsterdam, soweit gesetzlich zul\u00E4ssig'],
  [
    'Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland \\u00B7 Neue Mainzer Str. 28 \\u00B7 60311 Frankfurt am Main \\u00B7 HRB 81939',
    'bunq B.V. \\u00B7 Naritaweg 131\\u2013133 \\u00B7 1043 BS Amsterdam \\u00B7 KvK 54992060',
  ],
  [
    'Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland \u00B7 Neue Mainzer Str. 28 \u00B7 60311 Frankfurt am Main \u00B7 HRB 81939',
    'bunq B.V. \u00B7 Naritaweg 131\u2013133 \u00B7 1043 BS Amsterdam \u00B7 KvK 54992060',
  ],
  ['rgb(26/255,  58/255, 107/255)', 'rgb(11/255, 79/255, 108/255)'],
  ['rgb(0/255,   120/255, 212/255)', 'rgb(255/255, 120/255, 25/255)'],
  ['rgb(236/255, 242/255, 250/255)', 'rgb(242/255, 248/255, 250/255)'],
  ['rgb(246/255, 249/255, 252/255)', 'rgb(245/255, 250/255, 252/255)'],
  ['rgb(240/255, 247/255, 255/255)', 'rgb(229/255, 242/255, 246/255)'],
  ['rgb(249/255, 251/255, 254/255)', 'rgb(250/255, 252/255, 253/255)'],
  ['bbvaLogo', 'bunqLogo'],
];

function transform(content, extra = []) {
  let out = content;
  for (const [from, to] of [...PDF_REPLACEMENTS, ...extra]) {
    out = out.split(from).join(to);
  }
  return out;
}

const contractSrc = fs.readFileSync(path.join(root, 'src/lib/generateContractPdf.js'), 'utf8');
fs.writeFileSync(path.join(root, 'src/lib/generateBunqContractPdf.js'), transform(contractSrc));

const festgeldSrc = fs.readFileSync(path.join(root, 'src/lib/generateFestgeldPdf.js'), 'utf8');
fs.writeFileSync(
  path.join(root, 'src/lib/generateBunqFestgeldPdf.js'),
  transform(festgeldSrc, [["product: 'flexgeld'", "product: 'festgeld'"]]),
);

console.log('wrote generateBunqContractPdf.js and generateBunqFestgeldPdf.js');
