import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const NAVY = rgb(26 / 255, 58 / 255, 107 / 255);
const DARK = rgb(40 / 255, 55 / 255, 75 / 255);
const GRAY = rgb(122 / 255, 141 / 255, 166 / 255);
const RULE = rgb(210 / 255, 220 / 255, 230 / 255);
const ZEBRA = rgb(246 / 255, 249 / 255, 252 / 255);
const ACCENT = rgb(0 / 255, 120 / 255, 212 / 255);
const HEADER_BG = rgb(236 / 255, 242 / 255, 250 / 255);
const WHITE = rgb(1, 1, 1);

const PW = 841.89; // A4 landscape
const PH = 595.28;
const ML = 36;
const MR = 36;
const CW = PW - ML - MR;
const FOOTER_H = 30;

function wrap(text, font, size, maxW) {
  if (text == null || text === '') return [''];
  const words = String(text).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(t, size) > maxW) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = t;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

function trunc(text, font, size, maxW) {
  if (text == null) return '';
  const s = String(text);
  if (font.widthOfTextAtSize(s, size) <= maxW) return s;
  let t = s;
  while (t.length > 1 && font.widthOfTextAtSize(t + '\u2026', size) > maxW) {
    t = t.slice(0, -1);
  }
  return t + '\u2026';
}

/**
 * Generate a PDF with KPI summary + tabular contract data.
 *
 * @param {object} args
 * @param {string} args.title          Localized report title (e.g. "Festgeld-Report").
 * @param {string} [args.subtitle]     Optional sub-headline.
 * @param {Array<{label:string,value:string,hint?:string}>} [args.kpis]
 * @param {Array<{header:string,value:string|((row)=>any),width?:number,align?:'left'|'right'}>} args.columns
 * @param {Array<object>} args.rows
 * @param {Date|string} [args.generatedAt]
 * @param {string} [args.brand]        Footer brand line.
 * @returns {Promise<Blob>}
 */
export async function generateProductReportPdf({
  title,
  subtitle,
  kpis = [],
  columns = [],
  rows = [],
  generatedAt,
  brand = 'Fröhlich Vermögensberatung \u00B7 Vermögensreport',
} = {}) {
  const doc = await PDFDocument.create();
  const r = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  const today = generatedAt ? new Date(generatedAt) : new Date();
  const dateStr = today.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let pages = [];
  let pg;
  let y;

  function newPage(isCont = false) {
    pg = doc.addPage([PW, PH]);
    pages.push(pg);
    pg.drawRectangle({ x: 0, y: PH - 36, width: PW, height: 36, color: NAVY });
    pg.drawRectangle({ x: 0, y: PH - 38, width: PW, height: 2, color: ACCENT });
    pg.drawText(brand, { x: ML, y: PH - 22, size: 9, font: b, color: WHITE });
    pg.drawText(dateStr, {
      x: PW - MR - r.widthOfTextAtSize(dateStr, 8),
      y: PH - 22,
      size: 8,
      font: r,
      color: rgb(1, 1, 1, 0.7),
    });
    y = PH - 60;
    if (isCont) {
      pg.drawText(`${title} (Fortsetzung)`, {
        x: ML,
        y,
        size: 11,
        font: b,
        color: NAVY,
      });
      y -= 18;
    }
  }

  function need(h) {
    if (y - h < FOOTER_H + 6) newPage(true);
  }

  function hLine() {
    pg.drawLine({
      start: { x: ML, y },
      end: { x: PW - MR, y },
      thickness: 0.5,
      color: RULE,
    });
    y -= 6;
  }

  function titleBlock() {
    pg.drawText(title, { x: ML, y, size: 16, font: b, color: NAVY });
    y -= 18;
    if (subtitle) {
      pg.drawText(subtitle, { x: ML, y, size: 9, font: r, color: GRAY });
      y -= 14;
    }
    y -= 2;
  }

  function kpiRow() {
    if (!kpis || kpis.length === 0) return;
    const kCols = Math.min(kpis.length, 4);
    const cardW = (CW - (kCols - 1) * 8) / kCols;
    const cardH = 50;
    need(cardH + 10);
    const startY = y;
    kpis.slice(0, kCols * 2).forEach((kpi, i) => {
      const row = Math.floor(i / kCols);
      const col = i % kCols;
      const x = ML + col * (cardW + 8);
      const cy = startY - row * (cardH + 8);
      pg.drawRectangle({
        x,
        y: cy - cardH,
        width: cardW,
        height: cardH,
        color: HEADER_BG,
      });
      pg.drawLine({
        start: { x, y: cy },
        end: { x: x + cardW, y: cy },
        thickness: 1.2,
        color: ACCENT,
      });
      pg.drawText(trunc(kpi.label || '', r, 7, cardW - 12), {
        x: x + 8,
        y: cy - 14,
        size: 7,
        font: r,
        color: GRAY,
      });
      pg.drawText(trunc(kpi.value || '', b, 13, cardW - 12), {
        x: x + 8,
        y: cy - 30,
        size: 13,
        font: b,
        color: NAVY,
      });
      if (kpi.hint) {
        pg.drawText(trunc(kpi.hint, r, 7, cardW - 12), {
          x: x + 8,
          y: cy - 42,
          size: 7,
          font: r,
          color: DARK,
        });
      }
    });
    const rows = Math.ceil(Math.min(kpis.length, kCols * 2) / kCols);
    y = startY - rows * (cardH + 8) - 8;
  }

  function tableSection() {
    if (!columns || columns.length === 0) return;
    // Layout: equal-share with optional `width` weighting.
    const totalWeight = columns.reduce((s, c) => s + (c.width || 1), 0);
    const widths = columns.map((c) => (CW * (c.width || 1)) / totalWeight);

    // Header
    need(28);
    pg.drawRectangle({ x: ML, y: y - 18, width: CW, height: 18, color: NAVY });
    let cx = ML;
    columns.forEach((col, i) => {
      const text = trunc(String(col.header || ''), b, 8, widths[i] - 8);
      const tx =
        col.align === 'right'
          ? cx + widths[i] - 4 - b.widthOfTextAtSize(text, 8)
          : cx + 4;
      pg.drawText(text, { x: tx, y: y - 13, size: 8, font: b, color: WHITE });
      cx += widths[i];
    });
    y -= 22;

    // Rows
    rows.forEach((row, i) => {
      const cellTexts = columns.map((col) => {
        const raw =
          typeof col.value === 'function' ? col.value(row) : row[col.value];
        return raw == null ? '' : String(raw);
      });
      const lineSets = cellTexts.map((t, idx) => wrap(t, r, 7.5, widths[idx] - 8));
      const rowH = Math.max(14, lineSets.reduce((m, l) => Math.max(m, l.length), 1) * 9 + 4);
      need(rowH + 2);
      if (i % 2 === 0) {
        pg.drawRectangle({ x: ML, y: y - rowH, width: CW, height: rowH, color: ZEBRA });
      }
      cx = ML;
      cellTexts.forEach((t, idx) => {
        const lines = lineSets[idx];
        let ly = y - 10;
        lines.forEach((line) => {
          const w = r.widthOfTextAtSize(line, 7.5);
          const tx =
            columns[idx].align === 'right' ? cx + widths[idx] - 4 - w : cx + 4;
          pg.drawText(line, { x: tx, y: ly, size: 7.5, font: r, color: DARK });
          ly -= 9;
        });
        cx += widths[idx];
      });
      pg.drawLine({
        start: { x: ML, y: y - rowH },
        end: { x: PW - MR, y: y - rowH },
        thickness: 0.3,
        color: RULE,
      });
      y -= rowH;
    });
  }

  function footers() {
    const total = pages.length;
    pages.forEach((p, i) => {
      p.drawLine({
        start: { x: ML, y: FOOTER_H },
        end: { x: PW - MR, y: FOOTER_H },
        thickness: 0.4,
        color: RULE,
      });
      p.drawText(brand, { x: ML, y: FOOTER_H - 12, size: 7, font: r, color: GRAY });
      const pageStr = `Seite ${i + 1} von ${total}`;
      p.drawText(pageStr, {
        x: PW - MR - r.widthOfTextAtSize(pageStr, 7),
        y: FOOTER_H - 12,
        size: 7,
        font: r,
        color: GRAY,
      });
    });
  }

  newPage(false);
  titleBlock();
  hLine();
  kpiRow();
  hLine();
  tableSection();
  footers();

  const bytes = await doc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export default generateProductReportPdf;
