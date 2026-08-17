/**
 * Generate Postbank PDF libs from BBVA sources.
 * node scripts/generate-postbank-pdf-libs.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

const PDF_REPLACEMENTS = [
  ['generateContractPdf', 'generatePostbankContractPdf'],
  ['generateFestgeldPdf', 'generatePostbankFestgeldPdf'],
  ['drawBbvaPdfPage1Header', 'drawPostbankPdfPage1Header'],
  ['drawBbvaPdfContinuationHeader', 'drawPostbankPdfContinuationHeader'],
  ['embedBbvaLogo', 'embedPostbankLogoStub'],
  ["from './embedBbvaPdfHeader'", "from './embedPostbankPdfHeader'"],
  ['BBV-', 'PBK-'],
  ['BBVA Deutschland', 'Postbank'],
  ['der BBVA ', 'der Postbank '],
  ['bei der BBVA ', 'bei der Postbank '],
  ['www.bbva.de/allgemein/datenschutz', 'www.postbank.de/datenschutz'],
  ['Frankfurt am Main, soweit gesetzlich zul\u00E4ssig', 'Berlin, soweit gesetzlich zul\u00E4ssig'],
  ['Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland \u00B7 Neue Mainzer Str. 28 \u00B7 60311 Frankfurt am Main \u00B7 HRB 81939',
    'Deutsche Postbank AG \u00B7 Otto-Suhr-Allee 4-6 \u00B7 10557 Berlin \u00B7 HRB 6794'],
  ['rgb(26/255,  58/255, 107/255)', 'rgb(0/255, 51/255, 102/255)'],
  ['rgb(0/255,   120/255, 212/255)', 'rgb(255/255, 204/255, 0/255)'],
  ['rgb(236/255, 242/255, 250/255)', 'rgb(245/255, 245/255, 240/255)'],
  ['rgb(246/255, 249/255, 252/255)', 'rgb(250/255, 250/255, 245/255)'],
  ['rgb(240/255, 247/255, 255/255)', 'rgb(255/255, 252/255, 230/255)'],
  ['rgb(249/255, 251/255, 254/255)', 'rgb(252/255, 252/255, 248/255)'],
  ['bbvaLogo', 'postbankLogo'],
  ['const postbankLogo = await embedPostbankLogoStub(doc);', 'const postbankLogo = null;'],
];

function transform(content, extra = []) {
  let out = content;
  for (const [from, to] of [...PDF_REPLACEMENTS, ...extra]) {
    out = out.split(from).join(to);
  }
  return out;
}

const contractSrc = fs.readFileSync(path.join(root, 'src/lib/generateContractPdf.js'), 'utf8');
fs.writeFileSync(path.join(root, 'src/lib/generatePostbankContractPdf.js'), transform(contractSrc));

const festgeldSrc = fs.readFileSync(path.join(root, 'src/lib/generateFestgeldPdf.js'), 'utf8');
fs.writeFileSync(path.join(root, 'src/lib/generatePostbankFestgeldPdf.js'), transform(festgeldSrc, [
  ["product: 'flexgeld'", "product: 'festgeld'"],
]));

console.log('wrote generatePostbankContractPdf.js and generatePostbankFestgeldPdf.js');
