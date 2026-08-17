/**
 * Generate ING PDF libs from BBVA sources.
 * node scripts/generate-ing-pdf-libs.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

const PDF_REPLACEMENTS = [
  ['generateContractPdf', 'generateIngContractPdf'],
  ['generateFestgeldPdf', 'generateIngFestgeldPdf'],
  ['drawBbvaPdfPage1Header', 'drawIngPdfPage1Header'],
  ['drawBbvaPdfContinuationHeader', 'drawIngPdfContinuationHeader'],
  ['embedBbvaLogo', 'embedIngLogo'],
  ["from './embedBbvaPdfHeader'", "from './embedIngPdfHeader'"],
  ['BBV-', 'ING-'],
  ['BBVA Deutschland', 'ING B.V.'],
  ['der BBVA ', 'der ING '],
  ['bei der BBVA ', 'bei der ING '],
  ['www.bbva.de/allgemein/datenschutz', 'www.ing.nl/privacy'],
  ['Frankfurt am Main, soweit gesetzlich zul\\u00E4ssig', 'Amsterdam, soweit gesetzlich zul\\u00E4ssig'],
  ['Frankfurt am Main, soweit gesetzlich zul\u00E4ssig', 'Amsterdam, soweit gesetzlich zul\u00E4ssig'],
  [
    'Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland \\u00B7 Neue Mainzer Str. 28 \\u00B7 60311 Frankfurt am Main \\u00B7 HRB 81939',
    'ING B.V. \\u00B7 Bijlmerplein 888 \\u00B7 1102 MG Amsterdam \\u00B7 KvK 33031431',
  ],
  [
    'Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland \u00B7 Neue Mainzer Str. 28 \u00B7 60311 Frankfurt am Main \u00B7 HRB 81939',
    'ING B.V. \u00B7 Bijlmerplein 888 \u00B7 1102 MG Amsterdam \u00B7 KvK 33031431',
  ],
  ['rgb(26/255,  58/255, 107/255)', 'rgb(0/255, 48/255, 135/255)'],
  ['rgb(0/255,   120/255, 212/255)', 'rgb(255/255, 98/255, 0/255)'],
  ['rgb(236/255, 242/255, 250/255)', 'rgb(255/255, 245/255, 240/255)'],
  ['rgb(246/255, 249/255, 252/255)', 'rgb(255/255, 248/255, 244/255)'],
  ['rgb(240/255, 247/255, 255/255)', 'rgb(255/255, 232/255, 217/255)'],
  ['rgb(249/255, 251/255, 254/255)', 'rgb(255/255, 250/255, 247/255)'],
  ['bbvaLogo', 'ingLogo'],
];

function transform(content, extra = []) {
  let out = content;
  for (const [from, to] of [...PDF_REPLACEMENTS, ...extra]) {
    out = out.split(from).join(to);
  }
  return out;
}

const contractSrc = fs.readFileSync(path.join(root, 'src/lib/generateContractPdf.js'), 'utf8');
fs.writeFileSync(path.join(root, 'src/lib/generateIngContractPdf.js'), transform(contractSrc));

const festgeldSrc = fs.readFileSync(path.join(root, 'src/lib/generateFestgeldPdf.js'), 'utf8');
fs.writeFileSync(
  path.join(root, 'src/lib/generateIngFestgeldPdf.js'),
  transform(festgeldSrc, [["product: 'flexgeld'", "product: 'festgeld'"]]),
);

console.log('wrote generateIngContractPdf.js and generateIngFestgeldPdf.js');
