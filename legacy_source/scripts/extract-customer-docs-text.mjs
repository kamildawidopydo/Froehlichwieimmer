/**
 * Extract body text from current customer PDFs into scripts/_tmp-docs/
 * so generate-customer-documents.mjs can rebuild them without legal-entity codes.
 *
 * Run: node scripts/extract-customer-docs-text.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOC_DIR = path.join(ROOT, 'public/assets/documents');
const OUT_DIR = path.join(__dirname, '_tmp-docs');

const DOCS = [
  { key: 'kundendokumente', file: 'Kapitalmitte_Kundendokumente.pdf' },
  { key: 'risiken', file: 'Kapitalmitte_Risiken_der_Kapitalanlage.pdf' },
  { key: 'info', file: 'Kapitalmitte_Informationsbogen_Einlagenloesungen.pdf' },
];

function stripLei(text) {
  return String(text || '')
    .replace(/Legal Entity Identifier\s*\(LEI\)\s*:?\s*[0-9A-Z]{20}/gi, '')
    .replace(/Legal Entity Identifier\s*\n?\s*\(LEI\)\s*:?\s*/gi, '')
    .replace(/\s*[·•]\s*LEI\s*:?\s*[0-9A-Z]{20}/gi, '')
    .replace(/\bLEI\s*:?\s*[0-9A-Z]{20}/gi, '')
    .replace(/^\s*\(LEI\)\s*:?\s*$/gim, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isHeaderOrFooter(line, pageH) {
  const t = line.text.replace(/\s+/g, ' ').trim();
  if (!t) return true;
  // letter-spaced running header
  if (/Stand\s+Juli\s+2026/i.test(t) && /Kapitalmitte|Kundendokumente|Risiken|Informationsbogen/i.test(t.replace(/ /g, ''))) {
    return true;
  }
  if (/^KM-[A-Z]{2}-2026/i.test(t) && /Seite\s+\d+/i.test(t)) return true;
  if (/^Seite\s+\d+$/i.test(t)) return true;
  // leftover cover-meta band that sometimes appears under the header
  if (/^R\s*E\s*G\s*I\s*S\s*T\s*E\s*R$/i.test(t.replace(/\s+/g, ' '))) return true;
  if (/kundenservice@kapitalmitte\.com/i.test(t) && /REGISTER|HRB/i.test(t)) return true;
  if (/Amtsgericht Frankfurt am Main/i.test(t) && /HRB/i.test(t) && /\bLEI\b/i.test(t)) {
    // keep corporate address lines that are body "Unternehmensdaten" — those include more than register+lei
    if (t.length < 120) return true;
  }
  return false;
}

function pageLines(textContent) {
  const map = new Map();
  for (const it of textContent.items) {
    if (!it.str) continue;
    const y = Math.round(it.transform[5]);
    if (!map.has(y)) map.set(y, []);
    map.get(y).push({ x: it.transform[4], s: it.str });
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([y, parts]) => ({
      y,
      text: parts
        .sort((a, b) => a.x - b.x)
        .map((p) => p.s)
        .join('')
        .replace(/[ \t]+/g, ' ')
        .trim(),
    }))
    .filter((l) => l.text);
}

async function extractDoc(pdfjs, doc) {
  const bytes = new Uint8Array(fs.readFileSync(path.join(DOC_DIR, doc.file)));
  const pdf = await pdfjs.getDocument({ data: bytes, useSystemFonts: true }).promise;
  const chunks = [];
  const contentCount = pdf.numPages - 1; // exclude cover
  for (let i = 2; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const lines = pageLines(tc)
      .filter((l) => !isHeaderOrFooter(l))
      .map((l) => stripLei(l.text))
      .filter(Boolean);
    const body = stripLei(lines.join('\n'));
    const idx = i - 1;
    chunks.push(`-- ${idx} of ${contentCount} --\n${body}`);
  }
  const out = `${chunks.join('\n\n')}\n`;
  const outPath = path.join(OUT_DIR, `${doc.key}.txt`);
  fs.writeFileSync(outPath, out, 'utf8');
  console.log('OK', doc.key, `(${contentCount} content pages) →`, outPath);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  for (const doc of DOCS) {
    await extractDoc(pdfjs, doc);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
