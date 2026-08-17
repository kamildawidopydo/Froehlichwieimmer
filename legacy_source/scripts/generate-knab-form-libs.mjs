/**
 * Generate Knab form + PDF libs from BBVA sources.
 * node scripts/generate-knab-form-libs.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

const SHARED_REPLACEMENTS = [
  ['BBVA Deutschland', 'Knab B.V.'],
  ['der BBVA ', 'der Knab B.V. '],
  ['bei der BBVA ', 'bei der Knab B.V. '],
  ['und der BBVA ', 'und der Knab B.V. '],
  ['Produkte der BBVA', 'Produkte der Knab B.V.'],
  ['Aufnahmebestätigung der BBVA', 'Aufnahmebestätigung der Knab B.V.'],
  ['Anschrift BBVA', 'Anschrift Knab B.V.'],
  ['BBVA über', 'Knab B.V. über'],
  ['ist die BBVA ', 'ist die Knab B.V. '],
  ['www.bbva.de/allgemein/datenschutz', 'www.knab.nl/datenschutz'],
  ['Frankfurt am Main, soweit gesetzlich zulässig', 'Amsterdam, soweit gesetzlich zulässig'],
  ['Banco Bilbao Vizcaya Argentaria, S.A., Niederlassung Deutschland \u00B7 Neue Mainzer Str. 28 \u00B7 60311 Frankfurt am Main \u00B7 HRB 81939',
    'Knab B.V. \u00B7 Thomas R. Malthusstraat 1-3 \u00B7 1066 JR Amsterdam \u00B7 Niederlande \u00B7 KvK-Nr.: 30100799'],
  ['#1a3a6b', '#3E4A59'],
  ['#0A2540', '#2F3844'],
  ['#0078d4', '#E8A020'],
  ['#4da3e8', '#F0C060'],
  ['#F7FAFE', '#F4F5F7'],
  ['rgb(26/255,  58/255, 107/255)', 'rgb(62/255, 74/255, 89/255)'],
  ['rgb(44/255,  74/255, 110/255)', 'rgb(74/255, 86/255, 104/255)'],
  ['rgb(0/255,   120/255, 212/255)', 'rgb(232/255, 160/255, 32/255)'],
  ['rgb(240/255, 247/255, 255/255)', 'rgb(255/255, 244/255, 224/255)'],
  ['rgb(236/255, 242/255, 250/255)', 'rgb(236/255, 238/255, 241/255)'],
  ['rgb(246/255, 249/255, 252/255)', 'rgb(244/255, 245/255, 247/255)'],
  ['rgb(249/255, 251/255, 254/255)', 'rgb(247/255, 248/255, 250/255)'],
  ['BBV-', 'KNAB-'],
];

const LOGO_REPLACEMENT =
  '<div className="rounded-lg bg-white px-3 py-2 shrink-0"><img src="/assets/bank-logos/knab.svg" alt="Knab" className="h-7 w-auto object-contain" /></div>';

function transform(content, extra = []) {
  let out = content;
  for (const [from, to] of [...SHARED_REPLACEMENTS, ...extra]) {
    out = out.split(from).join(to);
  }
  return out;
}

// --- PDF header embed ---
const bbvaHeaderSrc = fs.readFileSync(path.join(root, 'src/lib/embedBbvaPdfHeader.js'), 'utf8');
const knabHeader = transform(bbvaHeaderSrc, [
  ['embedBbvaPdfHeader', 'embedKnabPdfHeader'],
  ['BBVA_PDF_NAVY', 'KNAB_PDF_PRIMARY'],
  ['BBVA_PDF_ACCENT', 'KNAB_PDF_ACCENT'],
  ['BBVA_PDF_WHITE', 'KNAB_PDF_WHITE'],
  ['BBVA_PDF_WHITE_MUTED', 'KNAB_PDF_WHITE_MUTED'],
  ['BBVA_PDF_WHITE_DIM', 'KNAB_PDF_WHITE_DIM'],
  ['bbva-logo-white.png', 'knab.svg'],
  ['loadBbvaLogoBytes', 'loadKnabLogoBytes'],
  ['embedBbvaLogo', 'embedKnabLogo'],
  ['drawBbvaPdfContinuationHeader', 'drawKnabPdfContinuationHeader'],
  ['drawBbvaPdfPage1Header', 'drawKnabPdfPage1Header'],
  ["pg.drawText('BBVA'", "pg.drawText('Knab B.V.'"],
  ['BBVA logo fetch failed', 'Knab logo fetch failed'],
  ['[embedBbvaLogo]', '[embedKnabLogo]'],
  ['rgb(26 / 255, 58 / 255, 107 / 255)', 'rgb(62 / 255, 74 / 255, 89 / 255)'],
  ['rgb(0 / 255, 120 / 255, 212 / 255)', 'rgb(232 / 255, 160 / 255, 32 / 255)'],
]);
fs.writeFileSync(path.join(root, 'src/lib/embedKnabPdfHeader.js'), knabHeader);

// --- Flexgeld PDF ---
const contractPdfSrc = fs.readFileSync(path.join(root, 'src/lib/generateContractPdf.js'), 'utf8');
fs.writeFileSync(
  path.join(root, 'src/lib/generateKnabFlexgeldPdf.js'),
  transform(contractPdfSrc, [
    ['generateContractPdf', 'generateKnabFlexgeldPdf'],
    ['drawBbvaPdfPage1Header', 'drawKnabPdfPage1Header'],
    ['drawBbvaPdfContinuationHeader', 'drawKnabPdfContinuationHeader'],
    ['embedBbvaLogo', 'embedKnabLogo'],
    ["from './embedBbvaPdfHeader'", "from './embedKnabPdfHeader'"],
    ['bbvaLogo', 'knabLogo'],
    ['logoEmbed: bbvaLogo', 'logoEmbed: knabLogo'],
  ]),
);

// --- Festgeld PDF ---
const festgeldPdfSrc = fs.readFileSync(path.join(root, 'src/lib/generateFestgeldPdf.js'), 'utf8');
fs.writeFileSync(
  path.join(root, 'src/lib/generateKnabFestgeldPdf.js'),
  transform(festgeldPdfSrc, [
    ['generateFestgeldPdf', 'generateKnabFestgeldPdf'],
    ['drawBbvaPdfPage1Header', 'drawKnabPdfPage1Header'],
    ['drawBbvaPdfContinuationHeader', 'drawKnabPdfContinuationHeader'],
    ['embedBbvaLogo', 'embedKnabLogo'],
    ["from './embedBbvaPdfHeader'", "from './embedKnabPdfHeader'"],
    ['bbvaLogo', 'knabLogo'],
    ['logoEmbed: bbvaLogo', 'logoEmbed: knabLogo'],
  ]),
);

// --- Flexgeld form ---
const flexFormSrc = fs.readFileSync(path.join(root, 'src/pages/BBVAContractForm.js'), 'utf8');
fs.writeFileSync(
  path.join(root, 'src/pages/knab/KnabFlexgeldVertrag.js'),
  transform(flexFormSrc, [
    ['BBVAContractForm', 'KnabFlexgeldVertrag'],
    ['generateContractPdf', 'generateKnabFlexgeldPdf'],
    ['prepareBbvaPdfData', 'prepareKnabFlexgeldPdfData'],
    ['BBVA_FLEXGELD_CONDITIONS', 'KNAB_FLEXGELD_CONDITIONS'],
    ['/api/send-contract-email', '/api/send-knab-email'],
    ['<img src="/assets/bank-logos/bbva-logo-white.png" alt="BBVA" className="h-8 w-auto object-contain shrink-0" />', LOGO_REPLACEMENT],
    ['pages/BBVAContractForm', 'pages/knab/KnabFlexgeldVertrag'],
  ]),
);

// --- Festgeld form ---
const festFormSrc = fs.readFileSync(path.join(root, 'src/pages/bbva/BBVAFestgeldVertrag.js'), 'utf8');
fs.writeFileSync(
  path.join(root, 'src/pages/knab/KnabFestgeldVertrag.js'),
  transform(festFormSrc, [
    ['BBVAFestgeldVertrag', 'KnabFestgeldVertrag'],
    ['generateFestgeldPdf', 'generateKnabFestgeldPdf'],
    ['prepareBbvaFestgeldPdfData', 'prepareKnabFestgeldPdfData'],
    ['BBVA_FESTGELD_CONDITIONS', 'KNAB_FESTGELD_CONDITIONS'],
    ['/api/send-festgeld-email', '/api/send-knab-festgeld-email'],
    ['<img src="/assets/bank-logos/bbva-logo-white.png" alt="BBVA" className="h-8 w-auto object-contain shrink-0" />', LOGO_REPLACEMENT],
    ['pages/bbva/BBVAFestgeldVertrag', 'pages/knab/KnabFestgeldVertrag'],
  ]),
);

console.log('Generated Knab flex/fest forms and PDF libs.');
