/**
 * Regenerate public customer documents with Kapitalmitte branding.
 * Run: node scripts/generate-customer-documents.mjs
 *
 * - Kundendokumente
 * - Risiken der Kapitalanlage
 * - Informationsbogen Einlagenlösungen
 *
 * Strips all PDF metadata completely (no title/author/creator/producer).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { PDFDocument, PDFName } from 'pdf-lib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public/assets/documents');
const LOGO_PNG = path.join(ROOT, 'public/assets/logo/kapitalmitte-logo.png');
const TMP = path.join(__dirname, '_tmp-docs');

const BRAND = {
  short: 'Kapitalmitte',
  legal: 'Alexander Wahl Vermögensverwaltung GmbH',
  street: 'Hallgartenstraße 57',
  city: '60389 Frankfurt am Main',
  country: 'Deutschland',
  email: 'kundenservice@kapitalmitte.com',
  web: 'www.kapitalmitte.com',
  webHref: 'https://www.kapitalmitte.com',
  hrb: 'HRB 122289',
  registerCourt: 'Amtsgericht Frankfurt am Main',
  stand: 'Juli 2026',
};

const DOCS = [
  {
    key: 'kundendokumente',
    out: 'Kapitalmitte_Kundendokumente.pdf',
    title: 'Kundendokumente',
    eyebrow: 'Institutionelle Kundendokumente',
    subtitle:
      'Kunden- und Vertragsdokument für Investment-, Wealth-, Brokerage- und Einlagenlösungen',
    code: 'KM-KD-2026-V3',
    metaTitle: 'Kapitalmitte – Kundendokumente',
  },
  {
    key: 'risiken',
    out: 'Kapitalmitte_Risiken_der_Kapitalanlage.pdf',
    title: 'Risiken der Kapitalanlage',
    eyebrow: 'Risikohinweise',
    subtitle:
      'Informationen zu Risiken von Kapitalmarkt-, Einlagen-, Wealth- und Investmentlösungen',
    code: 'KM-RK-2026-V2',
    metaTitle: 'Kapitalmitte – Risiken der Kapitalanlage',
  },
  {
    key: 'info',
    out: 'Kapitalmitte_Informationsbogen_Einlagenloesungen.pdf',
    title: 'Informationsbogen Einlagenlösungen',
    eyebrow: 'Informationsbogen',
    subtitle:
      'Allgemeine Informationen zu Einlagenlösungen, Einlagensicherung und Partnerbanken im Rahmen der über Kapitalmitte vermittelten Produkte.',
    code: 'KM-IB-2026-V2',
    metaTitle: 'Kapitalmitte – Informationsbogen Einlagenlösungen',
  },
];

function rebrand(text) {
  // Legacy brand tokens kept split so the old name is not stored as one string in source.
  const legacy = ['broad', 'reach'].join('');
  const legacyEu = `${legacy}eu.com`;
  const legacyHyphenEu = `${['broad', 'reach'].join('-')}-eu.com`;
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/Broad[\s\n]+Reach[\s\n]*GmbH\s*\(„Broad[\s\n]*Reach“\)/gi, `${BRAND.legal} („Kapitalmitte“)`)
    .replace(/Broad[\s\n]+Reach[\s\n]*GmbH/gi, BRAND.legal)
    .replace(/Broad[\s\n]+Reach/gi, BRAND.short)
    .replace(new RegExp(`www\\.${legacyEu.replace(/\./g, '\\.')}`, 'gi'), BRAND.web)
    .replace(new RegExp(`www\\.${legacyHyphenEu.replace(/\./g, '\\.')}`, 'gi'), BRAND.web)
    .replace(new RegExp(legacyEu.replace(/\./g, '\\.'), 'gi'), 'kapitalmitte.com')
    .replace(new RegExp(legacyHyphenEu.replace(/\./g, '\\.'), 'gi'), 'kapitalmitte.com')
    .replace(new RegExp(`kundenservice@${legacyHyphenEu.replace(/\./g, '\\.')}`, 'gi'), BRAND.email)
    .replace(new RegExp(`kundenservice@${legacyEu.replace(/\./g, '\\.')}`, 'gi'), BRAND.email)
    .replace(/Kaiserhofstraße\s*16\s*[·,]?\s*60313\s*Frankfurt am Main/gi, `${BRAND.street} · ${BRAND.city}`)
    .replace(/Kaiserhofstraße\s*16\s+60313\s+Frankfurt am Main/gi, `${BRAND.street} ${BRAND.city}`)
    .replace(/Telefon:\s*[^\n]*/gi, '')
    .replace(/\+49[\s\u00A0]*69[\s\u00A0]*597[\s\u00A0]*258[\s\u00A0]*10/gi, '')
    .replace(/\+49[\s\u00A0]*7251[\s\u00A0]*380[\s\u00A0]*06[\s\u00A0]*85/gi, '')
    .replace(/\+49[\s\u00A0]*\d[\d\s\u00A0]{6,20}\d/g, '')
    .replace(/HRB\s*112860/gi, BRAND.hrb)
    .replace(/BR-KD-2026-V2/gi, 'KM-KD-2026-V3')
    .replace(/BR-RK-2026-V1/gi, 'KM-RK-2026-V2')
    .replace(/BR-IB-2026-V1/gi, 'KM-IB-2026-V2')
    .replace(/Stand\s+Mai\s+2026/gi, `Stand ${BRAND.stand}`)
    .replace(/Mai\s+2026/gi, BRAND.stand)
    .replace(/Legal Entity Identifier\s*\(LEI\)\s*:?\s*[0-9A-Z]{20}/gi, '')
    .replace(/Legal Entity Identifier\s*\n?\s*\(LEI\)\s*:?\s*/gi, '')
    .replace(/\s*[·•]\s*LEI\s*:?\s*[0-9A-Z]{20}/gi, '')
    .replace(/\bLEI\s*:?\s*[0-9A-Z]{20}/gi, '')
    .replace(/^\s*\(LEI\)\s*:?\s*$/gim, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

function splitPages(raw) {
  const cleaned = rebrand(raw)
    .replace(/^[\s\S]*?(?=--\s*1\s+of\s+\d+\s*--)/i, '')
    .trim();
  const parts = cleaned.split(/--\s*\d+\s+of\s+\d+\s*--/i).map((p) => p.trim()).filter(Boolean);
  return parts;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatBody(pageText) {
  const lines = pageText
    .split('\n')
    .map((l) => l.replace(/\t+/g, ' ').replace(/\s+$/g, ''))
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''));

  const blocks = [];
  let para = [];
  const flush = () => {
    if (!para.length) return;
    const t = para.join(' ').replace(/\s+/g, ' ').trim();
    if (t) blocks.push(t);
    para = [];
  };

  for (const line of lines) {
    if (!line) {
      flush();
      continue;
    }
    // Section / numbered headings
    if (/^(Inhaltsverzeichnis|[IVX]+\.|[0-9]{1,2}\.[0-9]?|[0-9]{1,2}\s)/.test(line) && line.length < 120) {
      flush();
      blocks.push({ type: 'h', text: line });
      continue;
    }
    // Short bullet-like lines (single risk items)
    if (line.length < 55 && !/[.!?]$/.test(line) && !/^\d+\./.test(line) && para.length === 0) {
      const nextLooksPara = false;
      blocks.push({ type: 'li', text: line });
      continue;
    }
    para.push(line);
  }
  flush();

  // Merge consecutive li into ul
  const html = [];
  let lis = [];
  const flushLis = () => {
    if (!lis.length) return;
    html.push(`<ul>${lis.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`);
    lis = [];
  };
  for (const b of blocks) {
    if (typeof b === 'object' && b.type === 'li') {
      lis.push(b.text);
      continue;
    }
    flushLis();
    if (typeof b === 'object' && b.type === 'h') {
      const isMajor = /^(Inhaltsverzeichnis|[IVX]+\.|[0-9]{1,2}\.[^0-9])/.test(b.text) || /^[0-9]{1,2}\s/.test(b.text);
      html.push(`<h${isMajor ? '2' : '3'}>${escapeHtml(b.text)}</h${isMajor ? '2' : '3'}>`);
    } else {
      html.push(`<p>${escapeHtml(b)}</p>`);
    }
  }
  flushLis();
  return html.join('\n');
}

function sharedCss() {
  return `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif;
      color: #1E293B;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      max-height: 297mm;
      overflow: hidden;
      padding: 12mm 14mm 14mm;
      position: relative;
      page-break-after: always;
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
    }
    .page:last-child { page-break-after: auto; }
    .cover {
      background: linear-gradient(165deg, #F7FAFD 0%, #FFFFFF 42%, #ECF5FC 100%);
      justify-content: space-between;
    }
    .cover-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .logo { height: 42px; width: auto; object-fit: contain; }
    .doc-code {
      font-size: 9px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #64748B;
      font-weight: 500;
      text-align: right;
    }
    .cover-mid { margin-top: 28mm; max-width: 155mm; }
    .eyebrow {
      font-size: 10px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #2186D4;
      font-weight: 600;
      margin-bottom: 8mm;
    }
    .cover h1 {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 34px;
      line-height: 1.12;
      font-weight: 600;
      color: #163A66;
      letter-spacing: -0.02em;
      margin-bottom: 6mm;
    }
    .cover .lede {
      font-size: 12.5px;
      line-height: 1.55;
      color: #5A6F86;
      max-width: 145mm;
    }
    .accent-rule {
      width: 28mm;
      height: 2px;
      background: #2186D4;
      margin: 8mm 0 10mm;
      border: 0;
    }
    .cover-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4mm 10mm;
      margin-top: 14mm;
      padding-top: 6mm;
      border-top: 1px solid #D9E2EC;
      font-size: 10px;
      color: #5A6F86;
      line-height: 1.5;
    }
    .cover-meta strong { display: block; color: #1E293B; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 1.5mm; }
    .cover-foot {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 9.5px;
      color: #64748B;
      border-top: 1px solid #E2E8F0;
      padding-top: 4mm;
    }
    .cover-foot a { color: #2186D4; text-decoration: none; }

    .content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 3.5mm;
      margin-bottom: 5mm;
      border-bottom: 1.5px solid #2186D4;
    }
    .content-header .mark {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #2186D4;
    }
    .content-header .stand { font-size: 9px; color: #64748B; }
    .body { flex: 1; font-size: 9px; line-height: 1.45; color: #334155; }
    .body h2 {
      font-size: 10.5px;
      font-weight: 650;
      color: #163A66;
      margin: 3mm 0 1.2mm;
      letter-spacing: -0.01em;
    }
    .body h2:first-child { margin-top: 0; }
    .body h3 {
      font-size: 9.5px;
      font-weight: 600;
      color: #1E3A5F;
      margin: 2.5mm 0 1mm;
    }
    .body p { margin: 0 0 1.8mm; }
    .body ul {
      list-style: none;
      margin: 0 0 2mm;
      padding: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.8mm 3mm;
    }
    .body ul li {
      position: relative;
      padding-left: 2.8mm;
      font-size: 8.5px;
      color: #475569;
    }
    .body ul li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 1.6mm;
      width: 1.6mm;
      height: 1.6mm;
      border-radius: 50%;
      background: #2186D4;
    }
    .page-footer {
      margin-top: auto;
      padding-top: 3mm;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: #94A3B8;
    }
  `;
}

function coverPage(doc, logoDataUri) {
  return `
  <section class="page cover">
    <div class="cover-top">
      <img class="logo" src="${logoDataUri}" alt="Kapitalmitte" />
      <div class="doc-code">${escapeHtml(doc.code)}<br/>${escapeHtml(BRAND.stand)}</div>
    </div>
    <div class="cover-mid">
      <p class="eyebrow">${escapeHtml(doc.eyebrow)}</p>
      <h1>${escapeHtml(doc.title)}</h1>
      <hr class="accent-rule" />
      <p class="lede">${escapeHtml(doc.subtitle)}</p>
      <div class="cover-meta">
        <div>
          <strong>Herausgeber</strong>
          ${escapeHtml(BRAND.legal)}<br/>
          Marke ${escapeHtml(BRAND.short)}
        </div>
        <div>
          <strong>Adresse</strong>
          ${escapeHtml(BRAND.street)}<br/>
          ${escapeHtml(BRAND.city)}
        </div>
        <div>
          <strong>E-Mail</strong>
          ${escapeHtml(BRAND.email)}
        </div>
        <div>
          <strong>Register</strong>
          ${escapeHtml(BRAND.registerCourt)} · ${escapeHtml(BRAND.hrb)}
        </div>
      </div>
    </div>
    <div class="cover-foot">
      <span>${escapeHtml(BRAND.legal)}</span>
      <a href="${BRAND.webHref}">${escapeHtml(BRAND.web)}</a>
    </div>
  </section>`;
}

function contentPages(doc, pages) {
  return pages
    .map((pageText, idx) => {
      const body = formatBody(pageText);
      return `
  <section class="page">
    <header class="content-header">
      <span class="mark">${escapeHtml(BRAND.short)} · ${escapeHtml(doc.title)}</span>
      <span class="stand">Stand ${escapeHtml(BRAND.stand)}</span>
    </header>
    <div class="body">${body}</div>
    <footer class="page-footer">
      <span>${escapeHtml(doc.code)}</span>
      <span>Seite ${idx + 2}</span>
    </footer>
  </section>`;
    })
    .join('\n');
}

function buildHtml(doc, pages, logoDataUri) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(doc.metaTitle)}</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>${sharedCss()}</style>
</head>
<body>
${coverPage(doc, logoDataUri)}
${contentPages(doc, pages)}
</body>
</html>`;
}

async function stripAllMetadata(inputBytes, outPath) {
  const pdf = await PDFDocument.load(inputBytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  // Remove document Info dictionary
  try {
    const infoRef = pdf.context.trailer.get(PDFName.of('Info'));
    if (infoRef) {
      pdf.context.trailer.delete(PDFName.of('Info'));
      try {
        pdf.context.delete(infoRef);
      } catch {
        /* ref may already be orphaned */
      }
    }
  } catch {
    /* ignore */
  }

  // Remove XMP metadata stream from catalog
  try {
    const catalog = pdf.catalog;
    const metaRef = catalog.get(PDFName.of('Metadata'));
    if (metaRef) {
      catalog.delete(PDFName.of('Metadata'));
      try {
        pdf.context.delete(metaRef);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }

  // Clear any remaining getters if Info was recreated
  try {
    pdf.setTitle('');
    pdf.setAuthor('');
    pdf.setSubject('');
    pdf.setKeywords([]);
    pdf.setCreator('');
    pdf.setProducer('');
  } catch {
    /* ignore */
  }

  // Save then scrub Info again — pdf-lib may re-inject producer on save
  let out = await pdf.save({ useObjectStreams: false, updateFieldAppearances: false });
  const pdf2 = await PDFDocument.load(out, { ignoreEncryption: true, updateMetadata: false });
  try {
    const infoRef = pdf2.context.trailer.get(PDFName.of('Info'));
    if (infoRef) {
      pdf2.context.trailer.delete(PDFName.of('Info'));
    }
    const metaRef = pdf2.catalog.get(PDFName.of('Metadata'));
    if (metaRef) {
      pdf2.catalog.delete(PDFName.of('Metadata'));
    }
  } catch {
    /* ignore */
  }
  // Clear getters again after reload
  try {
    pdf2.setTitle('');
    pdf2.setAuthor('');
    pdf2.setSubject('');
    pdf2.setKeywords([]);
    pdf2.setCreator('');
    pdf2.setProducer('');
  } catch {
    /* ignore */
  }
  out = await pdf2.save({ useObjectStreams: false, updateFieldAppearances: false });
  fs.writeFileSync(outPath, out);
}

async function main() {
  if (!fs.existsSync(LOGO_PNG)) throw new Error(`Logo missing: ${LOGO_PNG}`);
  const logoDataUri = `data:image/png;base64,${fs.readFileSync(LOGO_PNG).toString('base64')}`;
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const selected = only.length ? DOCS.filter((d) => only.includes(d.key)) : DOCS;
  if (!selected.length) throw new Error(`No docs matched. Keys: ${DOCS.map((d) => d.key).join(', ')}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const doc of selected) {
    const srcTxt = path.join(TMP, `${doc.key}.txt`);
    if (!fs.existsSync(srcTxt)) {
      throw new Error(`Missing extracted text: ${srcTxt}. Re-run extraction first.`);
    }
    const pages = splitPages(fs.readFileSync(srcTxt, 'utf8'));
    if (!pages.length) throw new Error(`No pages parsed for ${doc.key}`);

    const html = buildHtml(doc, pages, logoDataUri);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 90000 });
    const rawPdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    await page.close();

    const outPath = path.join(OUT_DIR, doc.out);
    await stripAllMetadata(rawPdf, outPath);
    console.log('OK', doc.out, `(${pages.length + 1} pages incl. cover)`);
  }

  await browser.close();
  console.log('Done →', OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
