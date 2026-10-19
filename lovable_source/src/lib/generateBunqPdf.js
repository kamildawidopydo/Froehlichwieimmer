import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import siteContact from '@/data/siteContact';
import { embedSignatureInPdf } from './embedSignatureInPdf';
import { buildContractBarcodePayload, drawPdfHeaderSecurityMatrix } from './embedPdfBarcode';

const NAVY       = rgb(0/255,  52/255, 89/255);
const NAVY2      = rgb(0/255,  80/255, 122/255);
const ACCENT     = rgb(0/255, 166/255, 160/255);
const ACCENT2    = rgb(0/255, 180/255, 174/255);
const BLACK      = rgb(0, 0, 0);
const WHITE      = rgb(1, 1, 1);
const GRAY       = rgb(90/255, 113/255, 132/255);
const GRAY2      = rgb(125/255, 146/255, 163/255);
const LIGHT_BG   = rgb(242/255, 246/255, 250/255);
const BOX_BORDER = rgb(184/255, 202/255, 216/255);
const RULE       = rgb(212/255, 222/255, 232/255);
const ZEBRA      = rgb(247/255, 250/255, 253/255);
const WARN_BG    = rgb(230/255, 247/255, 247/255);
const WARN_BD    = rgb(168/255, 216/255, 214/255);
const SECTION_BG = rgb(232/255, 241/255, 248/255);
const DARK_TEXT  = rgb(13/255,  33/255, 55/255);
const MID_TEXT   = rgb(44/255,  64/255, 86/255);

const PW = 595.28;
const PH = 841.89;
const ML = 46;
const MR = 46;
const CW = PW - ML - MR;
const FOOTER_H = 32;
const TOP_CONT = 24;
const RH = 20;

function fmt(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return String(d); }
}

function wrap(text, font, size, maxW) {
  if (!text) return [''];
  const words = String(text).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(t, size) > maxW) { if (cur) lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

function truncVal(text, font, size, maxW) {
  if (!text) return '';
  const s = String(text);
  if (font.widthOfTextAtSize(s, size) <= maxW) return s;
  let t = s;
  while (t.length > 1 && font.widthOfTextAtSize(t + '\u2026', size) > maxW) t = t.slice(0, -1);
  return t + '\u2026';
}

export async function generateBunqPdf(formData) {
  const doc = await PDFDocument.create();
  const r = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  const today = new Date().toLocaleDateString('de-DE');
  const pages = [];
  const cNr = formData.contractNumber || `BUNQ-${Date.now().toString().slice(-6)}`;
  const securityPayload = buildContractBarcodePayload({ contractNumber: cNr, product: 'bunq' });

  const c2 = ML + CW / 2 + 5;
  const fw = CW / 2 - 9;

  function newPage(isCont = true) {
    const pg = doc.addPage([PW, PH]);
    pages.push(pg);
    let startY = PH - TOP_CONT;
    if (isCont) {
      const barH = 18;
      const barBottom = PH - barH;
      pg.drawRectangle({ x: 0, y: barBottom, width: PW, height: barH, color: NAVY });
      pg.drawText('Bunq B.V.  \u2014  Kapitalanlagenvertrag', { x: ML, y: PH - 13, size: 6, font: b, color: WHITE });
      if (securityPayload) {
        drawPdfHeaderSecurityMatrix(pg, securityPayload, {
          PW, MR, barBottom, barHeight: barH, width: 58, height: 8, pad: 1,
          dark: NAVY,
        });
      }
      const dateX = securityPayload ? PW - MR - 58 - 52 : PW - MR - 38;
      pg.drawText(today, { x: dateX, y: PH - 13, size: 5.5, font: r, color: rgb(1, 1, 1) });
      startY = PH - 36;
    }
    return { pg, y: startY };
  }

  function need(state, pts) {
    if (state.y - pts < FOOTER_H) {
      const ns = newPage(true);
      state.pg = ns.pg;
      state.y  = ns.y;
    }
  }

  function footer(pg, n, tot) {
    pg.drawLine({ start: { x: ML, y: FOOTER_H - 4 }, end: { x: PW - MR, y: FOOTER_H - 4 }, thickness: 0.8, color: NAVY });
    pg.drawText('Bunq B.V. | Naritaweg 131-133 | 1043 BS Amsterdam | Niederlande | KvK-Nr.: 54992060',
      { x: ML, y: FOOTER_H - 14, size: 5, font: r, color: GRAY });
    pg.drawText(`Seite ${n} von ${tot}`, { x: PW - MR - 48, y: FOOTER_H - 14, size: 5.5, font: r, color: GRAY });
  }

  function drawWrapped(state, x, text, fontFace, size, maxW, color, lineH) {
    wrap(text, fontFace, size, maxW).forEach(l => {
      need(state, lineH + 2);
      state.pg.drawText(l, { x, y: state.y, size, font: fontFace, color });
      state.y -= lineH;
    });
  }

  function secBar(state, title, altColor) {
    need(state, 16);
    state.y -= 1;
    state.pg.drawRectangle({ x: ML, y: state.y - 1, width: CW, height: 13, color: altColor || NAVY });
    state.pg.drawText(title, { x: ML + 10, y: state.y + 2, size: 7, font: b, color: WHITE });
    state.y -= 15;
  }

  function secHdr(state, num, title) {
    need(state, 18);
    state.y -= 1;
    state.pg.drawRectangle({ x: ML, y: state.y - 1, width: CW, height: 12, color: SECTION_BG });
    state.pg.drawRectangle({ x: ML, y: state.y - 1, width: 15, height: 12, color: NAVY });
    state.pg.drawText(num, { x: ML + 4, y: state.y + 2, size: 6.5, font: b, color: WHITE });
    state.pg.drawText(title.toUpperCase(), { x: ML + 21, y: state.y + 2, size: 6, font: b, color: NAVY });
    state.pg.drawLine({ start: { x: ML, y: state.y - 1 }, end: { x: PW - MR, y: state.y - 1 }, thickness: 0.3, color: BOX_BORDER });
    state.y -= 14;
  }

  function fld(pg, x, y, label, value, w) {
    const valStr = truncVal(value || '\u2014', b, 7, w - 2);
    pg.drawText(label, { x, y, size: 4.5, font: r, color: GRAY });
    pg.drawText(valStr, { x, y: y - 8, size: 7, font: b, color: BLACK });
    pg.drawLine({ start: { x, y: y - 12 }, end: { x: x + w, y: y - 12 }, thickness: 0.3, color: RULE });
  }

  function fldRow(state, l1, v1, l2, v2) {
    need(state, RH);
    fld(state.pg, ML, state.y, l1, v1, fw);
    fld(state.pg, c2, state.y, l2, v2, fw);
    state.y -= RH;
  }

  function fldFull(state, label, value) {
    need(state, RH);
    fld(state.pg, ML, state.y, label, value, CW - 4);
    state.y -= RH;
  }

  function fld3(state, l1, v1, l2, v2, l3, v3) {
    need(state, RH);
    const w3 = (CW - 18) / 3;
    fld(state.pg, ML,               state.y, l1, v1, w3);
    fld(state.pg, ML + w3 + 6,      state.y, l2, v2, w3);
    fld(state.pg, ML + (w3 + 6) * 2, state.y, l3, v3, w3);
    state.y -= RH;
  }

  function fld4(state, l1, v1, l2, v2, l3, v3, l4, v4) {
    need(state, RH);
    const icw = CW / 4 - 5;
    fld(state.pg, ML,               state.y, l1, v1, icw);
    fld(state.pg, ML + CW / 4,     state.y, l2, v2, icw);
    fld(state.pg, ML + CW / 2,     state.y, l3, v3, icw);
    fld(state.pg, ML + CW * 3 / 4, state.y, l4, v4, icw);
    state.y -= RH;
  }

  function chkRow(state, label, checked) {
    const lines = wrap(label, r, 5.5, CW - 22);
    const totalH = Math.max(10, lines.length * 7 + 2);
    need(state, totalH);
    const bx = ML + 3;
    state.pg.drawRectangle({ x: bx, y: state.y - 1, width: 7, height: 7, borderColor: NAVY, borderWidth: 0.5, color: WHITE });
    if (checked) {
      state.pg.drawLine({ start: { x: bx + 1.5, y: state.y + 3.5 }, end: { x: bx + 3, y: state.y + 1 }, thickness: 1, color: ACCENT });
      state.pg.drawLine({ start: { x: bx + 3, y: state.y + 1 }, end: { x: bx + 6, y: state.y + 5.5 }, thickness: 1, color: ACCENT });
    }
    let ty = state.y;
    lines.forEach(l => { state.pg.drawText(l, { x: bx + 12, y: ty, size: 5.5, font: r, color: BLACK }); ty -= 7; });
    state.y -= totalH;
  }

  function infoBox(state, text) {
    const lines = wrap(text, r, 5, CW - 18);
    const bH = 8 + lines.length * 6;
    need(state, bH + 3);
    const bY = state.y - bH;
    state.pg.drawRectangle({ x: ML, y: bY, width: CW, height: bH, borderColor: BOX_BORDER, borderWidth: 0.5, color: LIGHT_BG });
    state.pg.drawLine({ start: { x: ML, y: bY + bH }, end: { x: ML, y: bY }, thickness: 2, color: NAVY });
    let ty = state.y - 5;
    lines.forEach(l => { state.pg.drawText(l, { x: ML + 9, y: ty, size: 5, font: r, color: MID_TEXT }); ty -= 6; });
    state.y = bY - 3;
  }

  function warnBox(state, text) {
    const lines = wrap(text, r, 5, CW - 18);
    const bH = 8 + lines.length * 6;
    need(state, bH + 3);
    const bY = state.y - bH;
    state.pg.drawRectangle({ x: ML, y: bY, width: CW, height: bH, color: WARN_BG, borderColor: WARN_BD, borderWidth: 0.5 });
    state.pg.drawLine({ start: { x: ML, y: bY + bH }, end: { x: ML, y: bY }, thickness: 2, color: ACCENT });
    let ty = state.y - 5;
    lines.forEach(l => { state.pg.drawText(l, { x: ML + 9, y: ty, size: 5, font: r, color: DARK_TEXT }); ty -= 6; });
    state.y = bY - 3;
  }

  function darkBox(state, title, text) {
    const tLines = wrap(title, b, 5.5, CW - 20);
    const cLines = wrap(text, r, 4.8, CW - 20);
    const bH = 10 + (tLines.length + cLines.length) * 6;
    need(state, bH + 3);
    const bY = state.y - bH;
    state.pg.drawRectangle({ x: ML, y: bY, width: CW, height: bH, color: NAVY });
    let ty = state.y - 5;
    tLines.forEach(l => { state.pg.drawText(l, { x: ML + 10, y: ty, size: 5.5, font: b, color: ACCENT }); ty -= 6; });
    cLines.forEach(l => { state.pg.drawText(l, { x: ML + 10, y: ty, size: 4.8, font: r, color: rgb(192/255, 204/255, 218/255) }); ty -= 6; });
    state.y = bY - 3;
  }

  function subTitle(state, text) {
    need(state, 14);
    state.pg.drawText(text, { x: ML, y: state.y, size: 6.5, font: b, color: NAVY });
    state.pg.drawLine({ start: { x: ML, y: state.y - 3 }, end: { x: ML + CW, y: state.y - 3 }, thickness: 0.8, color: RULE });
    state.y -= 12;
  }

  async function sigBlock(state, dateVal, sigImage, label, subLabel) {
    need(state, 46);
    const lw = CW / 2 - 20;
    const c1 = ML + 10;
    const c2x = ML + CW / 2 + 10;
    state.pg.drawText(dateVal || '', { x: c1, y: state.y + 2, size: 6.5, font: r, color: BLACK });
    state.pg.drawLine({ start: { x: c1, y: state.y }, end: { x: c1 + lw, y: state.y }, thickness: 0.5, color: NAVY });
    state.pg.drawText('Ort, Datum', { x: c1, y: state.y - 7, size: 4, font: r, color: GRAY });
    state.pg.drawLine({ start: { x: c2x, y: state.y }, end: { x: c2x + lw, y: state.y }, thickness: 0.5, color: NAVY });
    await embedSignatureInPdf(doc, state.pg, sigImage, c2x, state.y, lw, 36, 10);
    state.pg.drawText(`Unterschrift | ${label}`, { x: c2x, y: state.y - 10, size: 4, font: r, color: GRAY });
    if (subLabel) {
      state.pg.drawText(subLabel, { x: c1, y: state.y - 13, size: 3.5, font: r, color: GRAY2 });
    }
    state.y -= 32;
  }

  function genderCheck(state, salutation) {
    need(state, 10);
    const y = state.y;
    let x = ML;
    state.pg.drawRectangle({ x, y: y - 1, width: 7, height: 7, borderColor: NAVY, borderWidth: 0.5, color: WHITE });
    if (salutation === 'herr') state.pg.drawText('X', { x: x + 1.5, y: y, size: 5, font: b, color: NAVY });
    state.pg.drawText('Herr', { x: x + 10, y: y, size: 5.5, font: r, color: BLACK });
    x += 40;
    state.pg.drawRectangle({ x, y: y - 1, width: 7, height: 7, borderColor: NAVY, borderWidth: 0.5, color: WHITE });
    if (salutation === 'frau') state.pg.drawText('X', { x: x + 1.5, y: y, size: 5, font: b, color: NAVY });
    state.pg.drawText('Frau', { x: x + 10, y: y, size: 5.5, font: r, color: BLACK });
  }

  function familyCheck(state, familyStatus) {
    const y = state.y;
    let x = ML + 120;
    state.pg.drawText('Familienstand:', { x, y, size: 5.5, font: b, color: NAVY });
    x += 60;
    state.pg.drawRectangle({ x, y: y - 1, width: 7, height: 7, borderColor: NAVY, borderWidth: 0.5, color: WHITE });
    if (familyStatus === 'alleinstehend') state.pg.drawText('X', { x: x + 1.5, y: y, size: 5, font: b, color: NAVY });
    state.pg.drawText('alleinstehend', { x: x + 10, y: y, size: 5.5, font: r, color: BLACK });
    x += 68;
    state.pg.drawRectangle({ x, y: y - 1, width: 7, height: 7, borderColor: NAVY, borderWidth: 0.5, color: WHITE });
    if (familyStatus === 'verheiratet') state.pg.drawText('X', { x: x + 1.5, y: y, size: 5, font: b, color: NAVY });
    state.pg.drawText('verheiratet/verpartnert', { x: x + 10, y: y, size: 5.5, font: r, color: BLACK });
    state.y -= 10;
  }

  function drawIdRow(state, idType, idNumber, idAuthority) {
    need(state, 12);
    const y = state.y;
    let x = ML;
    state.pg.drawText('Ausgewiesen durch', { x, y, size: 5.5, font: r, color: GRAY });
    x += 70;
    state.pg.drawRectangle({ x, y: y - 1, width: 7, height: 7, borderColor: NAVY, borderWidth: 0.5, color: WHITE });
    if (idType === 'personalausweis') state.pg.drawText('X', { x: x + 1.5, y: y, size: 5, font: b, color: NAVY });
    state.pg.drawText('Personalausweis', { x: x + 10, y: y, size: 5.5, font: r, color: BLACK });
    x += 80;
    state.pg.drawRectangle({ x, y: y - 1, width: 7, height: 7, borderColor: NAVY, borderWidth: 0.5, color: WHITE });
    if (idType === 'reisepass') state.pg.drawText('X', { x: x + 1.5, y: y, size: 5, font: b, color: NAVY });
    state.pg.drawText('Reisepass', { x: x + 10, y: y, size: 5.5, font: r, color: BLACK });
    state.y -= 8;
    fldRow(state, 'Nummer', idNumber, 'Ausstellende Beh\u00F6rde', idAuthority);
  }

  // ---------------------------------------------------------------------------
  // PAGE 1 - Cover
  // ---------------------------------------------------------------------------
  const pg1 = doc.addPage([PW, PH]);
  pages.push(pg1);

  const hH = 56;
  pg1.drawRectangle({ x: 0, y: PH - hH, width: PW, height: hH, color: NAVY });
  pg1.drawRectangle({ x: 0, y: PH - hH, width: PW, height: 2.5, color: ACCENT });
  pg1.drawText('Bunq B.V.', { x: ML, y: PH - 26, size: 18, font: b, color: WHITE });
  pg1.drawLine({ start: { x: ML + 130, y: PH - 14 }, end: { x: ML + 130, y: PH - 44 }, thickness: 0.5, color: rgb(1, 1, 1) });
  pg1.drawText('Formular Festgeld und Flexgeld | 19798', { x: ML + 140, y: PH - 22, size: 6.5, font: r, color: ACCENT2 });
  pg1.drawText('Bunq B.V. 900 \u2013 0.2026', { x: ML + 140, y: PH - 32, size: 5.5, font: r, color: GRAY2 });
  if (securityPayload) {
    drawPdfHeaderSecurityMatrix(pg1, securityPayload, {
      PW, MR, barBottom: PH - hH, barHeight: hH, width: 88, height: 14, pad: 2,
      dark: NAVY,
    });
  }

  let s = { pg: pg1, y: PH - hH - 10 };

  s.pg.drawRectangle({ x: ML, y: s.y - 2, width: 140, height: 11, color: NAVY });
  s.pg.drawText('AUSFERTIGUNG F\u00DCR DIE BANK', { x: ML + 6, y: s.y + 1, size: 5, font: b, color: ACCENT });
  s.y -= 16;

  s.pg.drawText('Antrag auf Er\u00F6ffnung eines', { x: ML, y: s.y, size: 15, font: b, color: NAVY });
  s.y -= 16;
  s.pg.drawText('Fest- und Flexgeldkontos', { x: ML, y: s.y, size: 15, font: b, color: NAVY });
  s.y -= 16;

  const cNrField = formData.contractNumber || cNr;
  fldRow(s, 'Vertrags-Nr.', cNrField, 'Vertragsdatum', today);

  need(s, 6);
  s.pg.drawText('(i) Dieses Feld wird im Rahmen der Verarbeitung automatisch generiert.', { x: ML, y: s.y, size: 5, font: r, color: GRAY2 });
  s.y -= 8;

  s.pg.drawLine({ start: { x: ML, y: s.y }, end: { x: PW - MR, y: s.y }, thickness: 2, color: ACCENT });
  s.y -= 8;

  secBar(s, 'Vereinbarung \u00FCber eine Fest- und Flexgeldanlage');

  infoBox(s, 'Dieses Dokument best\u00E4tigt die Vereinbarung zwischen dem Anleger (nachfolgend Anleger genannt) und der Bunq B.V. (nachfolgend Bank genannt), vermittelt durch Fröhlich Vermögensberatung, www.essenceinvest.com.');

  subTitle(s, 'Die Anlage umfasst folgende M\u00F6glichkeiten:');

  need(s, 30);
  const cardW = (CW - 10) / 2;
  s.pg.drawRectangle({ x: ML, y: s.y - 26, width: cardW, height: 26, borderColor: BOX_BORDER, borderWidth: 0.5, color: WHITE });
  s.pg.drawLine({ start: { x: ML, y: s.y - 26 + 26 }, end: { x: ML, y: s.y - 26 }, thickness: 2.5, color: NAVY });
  s.pg.drawText('REINE FESTGELDANLAGE', { x: ML + 8, y: s.y - 6, size: 5.5, font: b, color: NAVY });
  s.pg.drawText('Feste Laufzeiten von 6, 12 oder 24 Monaten.', { x: ML + 8, y: s.y - 16, size: 5.5, font: r, color: MID_TEXT });

  const cx2 = ML + cardW + 10;
  s.pg.drawRectangle({ x: cx2, y: s.y - 26, width: cardW, height: 26, borderColor: BOX_BORDER, borderWidth: 0.5, color: WHITE });
  s.pg.drawLine({ start: { x: cx2, y: s.y - 26 + 26 }, end: { x: cx2, y: s.y - 26 }, thickness: 2.5, color: ACCENT });
  s.pg.drawText('FLEXGELDANLAGE', { x: cx2 + 8, y: s.y - 6, size: 5.5, font: b, color: NAVY2 });
  s.pg.drawText('Die ersten 3 Monate fest, die folgenden 9 Monate flexibel.', { x: cx2 + 8, y: s.y - 16, size: 5.5, font: r, color: MID_TEXT });
  s.y -= 28;

  warnBox(s, 'Die Vermittlung dieser Anlage erfolgt durch Fröhlich Vermögensberatung, www.essenceinvest.com. Mit der Unterzeichnung dieses Vertrages erkennen alle Parteien die in diesem Dokument festgelegten Konditionen und Bestimmungen als verbindlich an. Der Vertrag tritt mit dem Datum der Unterzeichnung in Kraft.');

  // ---------------------------------------------------------------------------
  // PAGE 2 - Applicant Data
  // ---------------------------------------------------------------------------
  const p2 = newPage(true);
  s.pg = p2.pg;
  s.y = p2.y;

  fldRow(s, 'Vertragsnummer', cNr, 'Letzte Vertragsnummer', '');

  need(s, 10);
  s.pg.drawText('Sind Sie bereits unser Kunde?', { x: ML, y: s.y, size: 5.5, font: r, color: MID_TEXT });
  const ecX = ML + 120;
  s.pg.drawRectangle({ x: ecX, y: s.y - 1, width: 7, height: 7, borderColor: NAVY, borderWidth: 0.5, color: WHITE });
  if (formData.existingCustomer) s.pg.drawText('X', { x: ecX + 1.5, y: s.y, size: 5, font: b, color: NAVY });
  s.pg.drawText('Ja', { x: ecX + 10, y: s.y, size: 5.5, font: r, color: BLACK });
  s.y -= 10;

  need(s, 12);
  s.pg.drawRectangle({ x: ML, y: s.y - 1, width: CW, height: 12, color: NAVY });
  let ctX = ML + 10;
  s.pg.drawText('Vertragsart:', { x: ctX, y: s.y + 2, size: 6, font: b, color: WHITE });
  ctX += 55;
  s.pg.drawRectangle({ x: ctX, y: s.y + 1, width: 7, height: 7, borderColor: WHITE, borderWidth: 0.5, color: rgb(0, 0, 0, 0) });
  if (formData.contractType === 'einzelvertrag') s.pg.drawText('X', { x: ctX + 1.5, y: s.y + 2, size: 5, font: b, color: WHITE });
  s.pg.drawText('Einzelvertrag', { x: ctX + 10, y: s.y + 2, size: 5.5, font: r, color: WHITE });
  ctX += 80;
  s.pg.drawRectangle({ x: ctX, y: s.y + 1, width: 7, height: 7, borderColor: WHITE, borderWidth: 0.5, color: rgb(0, 0, 0, 0) });
  if (formData.contractType === 'gemeinschaftsvertrag') s.pg.drawText('X', { x: ctX + 1.5, y: s.y + 2, size: 5, font: b, color: WHITE });
  s.pg.drawText('Gemeinschaftsvertrag', { x: ctX + 10, y: s.y + 2, size: 5.5, font: r, color: WHITE });
  s.y -= 14;

  // 1. Antragsteller
  secBar(s, '1. Antragsteller');
  genderCheck(s, formData.salutation);
  familyCheck(s, formData.familyStatus);

  fld4(s, 'Titel, Vorname, Name', formData.fullName, 'Geburtsdatum', fmt(formData.birthDate), 'Geburtsort', formData.birthPlace, 'Steuer-ID', formData.taxId);
  fld3(s, 'Stra\u00DFe, Hausnummer', formData.street, 'Postleitzahl', formData.postalCode, 'Wohnort', formData.city);
  fldRow(s, 'Telefonnummer', formData.phone, 'E-Mail-Adresse', formData.email);
  fldRow(s, 'Zurzeit ausge\u00FCbter Beruf', formData.profession, 'Bei Selbstst\u00E4ndigkeit: Branche', formData.selfEmployedBranch);

  need(s, 10);
  {
    const y = s.y;
    let x = ML;
    s.pg.drawText('Staatsangeh\u00F6rigkeit:', { x, y, size: 5, font: r, color: GRAY });
    x += 72;
    s.pg.drawRectangle({ x, y: y - 1, width: 7, height: 7, borderColor: NAVY, borderWidth: 0.5, color: WHITE });
    if (formData.nationality === 'deutsch') s.pg.drawText('X', { x: x + 1.5, y, size: 5, font: b, color: NAVY });
    s.pg.drawText('Deutsch', { x: x + 10, y, size: 5.5, font: r, color: BLACK });
    x += 52;
    s.pg.drawRectangle({ x, y: y - 1, width: 7, height: 7, borderColor: NAVY, borderWidth: 0.5, color: WHITE });
    if (formData.nationality === 'andere') s.pg.drawText('X', { x: x + 1.5, y, size: 5, font: b, color: NAVY });
    s.pg.drawText('andere:', { x: x + 10, y, size: 5.5, font: r, color: BLACK });
    if (formData.otherNationality) {
      s.pg.drawText(formData.otherNationality, { x: x + 40, y, size: 5.5, font: b, color: BLACK });
    }
    s.y -= 10;
  }

  drawIdRow(s, formData.idType, formData.idNumber, formData.idAuthority);
  need(s, 6);
  s.pg.drawText('Bitte Ausweiskopie (Vorder- u. R\u00FCckseite) unbedingt beif\u00FCgen!', { x: ML, y: s.y, size: 4.5, font: r, color: rgb(178/255, 34/255, 34/255) });
  s.y -= 8;

  // 2. Antragsteller (conditional rendering based on s_fullName)
  secBar(s, 'Gemeinschaftsvertrag \u2014 2. Antragsteller', NAVY2);

  if (formData.s_fullName) {
    genderCheck(s, formData.s_salutation);
    s.y -= 10;
    fld4(s, 'Titel, Vorname, Name', formData.s_fullName, 'Geburtsdatum', fmt(formData.s_birthDate), 'Geburtsort', formData.s_birthPlace, 'Steuer-ID', formData.s_taxId);
    fld3(s, 'Stra\u00DFe, Hausnummer', formData.s_street, 'Postleitzahl', formData.s_postalCode, 'Wohnort', formData.s_city);
    drawIdRow(s, formData.s_idType, formData.s_idNumber, formData.s_idAuthority);
    need(s, 6);
    s.pg.drawText('Bitte Ausweiskopie (Vorder- u. R\u00FCckseite) unbedingt beif\u00FCgen!', { x: ML, y: s.y, size: 4.5, font: r, color: rgb(178/255, 34/255, 34/255) });
    s.y -= 8;
  } else {
    need(s, 8);
    s.pg.drawText('(nur bei Gemeinschaftsvertr\u00E4gen auszuf\u00FCllen)', { x: ML, y: s.y, size: 5, font: r, color: GRAY2 });
    s.y -= 8;
  }

  // Gesetzliche Vertreter
  secBar(s, 'Gesetzliche Vertreter bei minderj\u00E4hrigen Antragstellern');

  if (formData.rep1_fullName) {
    need(s, 10);
    s.pg.drawText('1. Gesetzlicher Vertreter', { x: ML, y: s.y, size: 6.5, font: b, color: NAVY });
    s.y -= 10;
    fld4(s, 'Titel, Vorname, Name', formData.rep1_fullName, 'Geburtsdatum', fmt(formData.rep1_birthDate), 'Geburtsort', formData.rep1_birthPlace, 'Steuer-ID', formData.rep1_taxId);
    fld3(s, 'Stra\u00DFe, Hausnummer', formData.rep1_street, 'Postleitzahl', formData.rep1_postalCode, 'Wohnort', formData.rep1_city);
    drawIdRow(s, formData.rep1_idType, formData.rep1_idNumber, formData.rep1_idAuthority);
    if (formData.rep1_soleRepresentative) {
      chkRow(s, 'Ich bin alleinvertretungsberechtigter Elternteil/Vormund', true);
    }

    if (formData.rep2_fullName) {
      need(s, 10);
      s.pg.drawText('2. Gesetzlicher Vertreter', { x: ML, y: s.y, size: 6.5, font: b, color: NAVY });
      s.y -= 10;
      fld4(s, 'Titel, Vorname, Name', formData.rep2_fullName, 'Geburtsdatum', fmt(formData.rep2_birthDate), 'Geburtsort', formData.rep2_birthPlace, 'Steuer-ID', formData.rep2_taxId);
      fld3(s, 'Stra\u00DFe, Hausnummer', formData.rep2_street, 'Postleitzahl', formData.rep2_postalCode, 'Wohnort', formData.rep2_city);
      drawIdRow(s, formData.rep2_idType, formData.rep2_idNumber, formData.rep2_idAuthority);
    }
  } else {
    need(s, 8);
    s.pg.drawText('(nur bei minderj\u00E4hrigen Antragstellern auszuf\u00FCllen)', { x: ML, y: s.y, size: 5, font: r, color: GRAY2 });
    s.y -= 8;
  }

  // Festgeldkonditionen
  secHdr(s, '2', 'Angaben zur Festgeldanlage');
  secBar(s, 'Festgeldkonditionen');
  const festAmt = formData.investmentAmountDisplay ? `${formData.investmentAmountDisplay} EUR` : '';
  fld4(s,
    'Anlagebetrag (EUR)', festAmt,
    'Zinssatz p.a.', formData.interestRate || '',
    'Laufzeit', formData.term || '',
    'Willkommensbonus', formData.welcomeBonus ? `${formData.welcomeBonus} EUR` : ''
  );
  const zpLabels = { quarterly: 'viertelj\u00E4hrlich', 'semi-annual': 'halbj\u00E4hrlich', maturity: 'am Laufzeitende' };
  const zp = zpLabels[formData.interestPayment] || '\u2014';
  need(s, 10);
  s.pg.drawText(`Zinsgutschrift: ${zp}`, { x: ML, y: s.y, size: 5.5, font: b, color: NAVY });
  s.y -= 10;
  infoBox(s, 'Bitte beachten Sie, dass der Mindestanlagebetrag (je nach Zinssatz) zwischen 10.000,00 EUR und 30.000,00 EUR und der maximale Anlagebetrag 1.000.000,00 EUR betr\u00E4gt. Die Festgeldanlage erfolgt f\u00FCr die vertraglich vereinbarte Laufzeit als fest angelegte Anlage. Eine vorzeitige Verf\u00FCgung \u00FCber den Anlagebetrag ist w\u00E4hrend der gesamten Laufzeit grunds\u00E4tzlich ausgeschlossen. Nach Ablauf der Laufzeit werden Kapital und Zinsen automatisch auf das von Ihnen benannte Referenzkonto \u00FCberwiesen.');
  warnBox(s, 'Wichtiger Hinweis: Die Gew\u00E4hrung des Willkommensbonus setzt voraus, dass zum Zeitpunkt der Kontoer\u00F6ffnung keine bestehende Gesch\u00E4ftsbeziehung in Form eines Kontos bei der Bunq B.V. vorliegt. Der Bonus wird ausschlie\u00DFlich Neukunden gew\u00E4hrt, die bislang kein Konto bei der Bunq B.V. unterhalten haben. Bestehende oder ehemalige Kontoverbindungen k\u00F6nnen zum Ausschluss von der Bonusgew\u00E4hrung f\u00FChren.');

  // Referenzkonto
  secBar(s, 'Referenzkonto');
  infoBox(s, 'Referenzkonto f\u00FCr alle Auszahlungen (Girokonto bei einem Kreditinstitut im europ\u00E4ischen SEPA-Zahlungsraum). Auszahlungen erfolgen ausschlie\u00DFlich auf das hinterlegte Referenzkonto. \u00C4nderungen m\u00FCssen eigenh\u00E4ndig unterschrieben (in Textform gem\u00E4\u00DF \u00A7 126b BGB) erfolgen.');
  fldRow(s, 'Name der Bank', formData.bankName, 'Name des Kontoinhabers', formData.accountHolder);
  fldRow(s, 'BIC', formData.bic, 'IBAN', formData.iban);
  chkRow(s, 'Ich w\u00FCnsche keine automatische Verl\u00E4ngerung der Anlage. \u00DCbertragen Sie den Anlagebetrag und die angefallenen Zinsen nach Ende der Laufzeit auf das angegebene Gutschriftkonto.', !!formData.noAutoRenewal);

  // ---------------------------------------------------------------------------
  // PAGE 3 - Signatures
  // ---------------------------------------------------------------------------

  // Unterschriften
  need(s, 12);
  s.pg.drawRectangle({ x: ML, y: s.y - 1, width: CW, height: 11, color: LIGHT_BG });
  s.pg.drawText('UNTERSCHRIFTEN', { x: ML + 8, y: s.y + 1, size: 5, font: b, color: NAVY });
  s.y -= 14;

  await sigBlock(s, formData.sig1_date, formData.sig1_image, 'Antragsteller 1 (1. Kontoinhaber)', 'Bei Minderj\u00E4hrigen: Unterschriften beider Elternteile oder des/der gesetzlichen Vertreter/s');
  await sigBlock(s, formData.sig2_date, formData.sig2_image, 'Antragsteller 2 (2. Kontoinhaber)', '');
  await sigBlock(s, '', null, 'Bunq B.V.', '');

  // ---------------------------------------------------------------------------
  // PAGE 4 - Widerrufsrecht
  // ---------------------------------------------------------------------------
  const p4 = newPage(true);
  s.pg = p4.pg;
  s.y = p4.y;

  s.pg.drawRectangle({ x: ML, y: s.y - 2, width: 145, height: 11, color: NAVY });
  s.pg.drawText('AUSFERTIGUNG F\u00DCR DEN ANLEGER', { x: ML + 6, y: s.y + 1, size: 5, font: b, color: ACCENT });
  s.y -= 13;

  secBar(s, 'Widerrufsrecht');

  drawWrapped(s, ML, 'Sie haben das Recht, Ihre Vertragserkl\u00E4rung bez\u00FCglich der Produkte der Bunq B.V. innerhalb von 14 Tagen ohne Angabe von Gr\u00FCnden zu widerrufen. Die Widerrufsfrist beginnt nach dem Abschluss des Vertrags und nach Erhalt der Vertragsbestimmungen, einschlie\u00DFlich der Allgemeinen Gesch\u00E4ftsbedingungen sowie aller weiteren erforderlichen Informationen.', r, 5, CW, MID_TEXT, 6.5);
  s.y -= 2;

  function parTitle(state, marker, title) {
    need(state, 14);
    state.pg.drawRectangle({ x: ML, y: state.y - 1, width: 14, height: 12, color: NAVY });
    state.pg.drawText(marker, { x: ML + 4, y: state.y + 2, size: 6.5, font: b, color: ACCENT });
    state.pg.drawText(title, { x: ML + 20, y: state.y + 2, size: 6.5, font: b, color: NAVY });
    state.y -= 14;
  }

  parTitle(s, 'W', 'Widerruf \u00FCber Fröhlich Vermögensberatung');
  drawWrapped(s, ML, 'Der Widerruf Ihres Vertrags l\u00E4uft \u00FCber unseren Vermittler Fröhlich Vermögensberatung, damit der gesamte Vorgang f\u00FCr Sie besonders einfach, \u00FCbersichtlich und unkompliziert ist. Zur Wahrung der 14-t\u00E4gigen Frist gen\u00FCgt es, wenn Sie Ihren Widerruf rechtzeitig an kundenservice@essenceinvest.com senden.', r, 5, CW, MID_TEXT, 6.5);
  s.y -= 2;

  parTitle(s, 'F', 'Widerrufsfolgen');
  drawWrapped(s, ML, 'Im Falle eines wirksamen Widerrufs werden alle Zahlungen, die Sie an die Bunq B.V. geleistet haben, unverz\u00FCglich und sp\u00E4testens binnen 14 Tagen nach Erhalt Ihres Widerrufs vollst\u00E4ndig zur\u00FCckerstattet. F\u00FCr diese R\u00FCckzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der urspr\u00FCnglichen Transaktion eingesetzt haben.', r, 5, CW, MID_TEXT, 6.5);
  s.y -= 2;

  parTitle(s, 'H', 'Besondere Hinweise');
  drawWrapped(s, ML, 'Bitte beachten Sie, dass Ihr Widerrufsrecht erlischt, wenn der Vertrag vollst\u00E4ndig erf\u00FCllt wurde und Sie vor der Ausf\u00FChrung des Auftrags Ihre ausdr\u00FCckliche Zustimmung gegeben haben. Fröhlich Vermögensberatung tritt ausschlie\u00DFlich als Vermittler auf. Sie nimmt keine Gelder entgegen und f\u00FChrt auch keine Konten. Das Konto wird direkt auf Ihren Namen bei der Bunq B.V. gef\u00FChrt.', r, 5, CW, MID_TEXT, 6.5);
  s.y -= 2;

  warnBox(s, 'Es ist wichtig, sich der Bedeutung der Fristen und Anforderungen bewusst zu sein, um sicherzustellen, dass Ihr Widerruf wirksam ist. Bei Fragen zu Ihrem Widerrufsrecht stehen Ihnen Fröhlich Vermögensberatung und die Bunq B.V. gerne zur Verf\u00FCgung.');
  s.y -= 2;

  s.pg.drawLine({ start: { x: ML, y: s.y }, end: { x: PW - MR, y: s.y }, thickness: 1.5, color: ACCENT });
  s.y -= 6;

  subTitle(s, 'Kontaktanschriften und Kommunikationsdaten');

  need(s, 58);
  const ccW = (CW - 10) / 2;
  const ccH = 52;
  s.pg.drawRectangle({ x: ML, y: s.y - ccH, width: ccW, height: ccH, borderColor: BOX_BORDER, borderWidth: 0.5, color: LIGHT_BG });
  s.pg.drawText('Anschrift Bunq B.V.', { x: ML + 6, y: s.y - 5, size: 4.5, font: b, color: NAVY });
  s.pg.drawText('Naritaweg 131-133', { x: ML + 6, y: s.y - 14, size: 5, font: r, color: MID_TEXT });
  s.pg.drawText('1043 BS Amsterdam', { x: ML + 6, y: s.y - 22, size: 5, font: r, color: MID_TEXT });
  s.pg.drawText('Niederlande', { x: ML + 6, y: s.y - 30, size: 5, font: r, color: MID_TEXT });
  s.pg.drawText('KvK-Nr.: 54992060', { x: ML + 6, y: s.y - 38, size: 5, font: r, color: MID_TEXT });

  const cc2X = ML + ccW + 10;
  s.pg.drawRectangle({ x: cc2X, y: s.y - ccH, width: ccW, height: ccH, borderColor: BOX_BORDER, borderWidth: 0.5, color: LIGHT_BG });
  s.pg.drawText('FRÖHLICH', { x: cc2X + 6, y: s.y - 5, size: 4.5, font: b, color: NAVY });
  s.pg.drawText(siteContact.customerServiceStreet, { x: cc2X + 6, y: s.y - 14, size: 5, font: r, color: MID_TEXT });
  s.pg.drawText(`${siteContact.customerServicePostalCity}, Deutschland`, { x: cc2X + 6, y: s.y - 22, size: 5, font: r, color: MID_TEXT });
  s.pg.drawText(`Tel.: ${siteContact.phoneDisplay}`, { x: cc2X + 6, y: s.y - 30, size: 5, font: r, color: MID_TEXT });
  s.pg.drawText(`E-Mail: ${siteContact.email}`, { x: cc2X + 6, y: s.y - 38, size: 5, font: b, color: NAVY });
  s.y -= ccH + 6;

  infoBox(s, 'Fröhlich Vermögensberatung ist die Vermittlungsstelle zwischen dem Verbraucher und der Bunq B.V. Sie bietet umfassende Unterst\u00FCtzung bei der Antragstellung, beantwortet Kundenanfragen und k\u00FCmmert sich um alle zugeh\u00F6rigen Gesch\u00E4ftsprozesse.');

  // ---------------------------------------------------------------------------
  // PAGE 5+6 - Vertragsbedingungen §1-§18
  // ---------------------------------------------------------------------------
  const p5 = newPage(true);
  s.pg = p5.pg;
  s.y = p5.y;

  s.pg.drawRectangle({ x: ML, y: s.y - 2, width: 145, height: 11, color: NAVY });
  s.pg.drawText('AUSFERTIGUNG F\u00DCR DEN ANLEGER', { x: ML + 6, y: s.y + 1, size: 5, font: b, color: ACCENT });
  s.y -= 13;

  secBar(s, 'Kapitalanlagevertrag \u2013 Vertragsbedingungen und Informationen');

  const terms = [
    ['\u00A71', 'Vertragsgegenstand und Leistungsbeschreibung',
      'Gegenstand dieses Vertrags ist die Anlage von Geldern des Kunden bei der Bunq B.V. in der jeweils beantragten Kapitalanlageform, insbesondere als Festgeld oder Flexgeld. Die wesentlichen Merkmale der jeweiligen Finanzdienstleistung, einschlie\u00DFlich Laufzeit, Verzinsung sowie Art und Zeitpunkt der Zinsgutschrift, ergeben sich aus den Vertragsbestimmungen sowie den Allgemeinen Gesch\u00E4ftsbedingungen.'],
    ['\u00A72', 'Zustandekommen des Vertrags',
      'Der Vertrag kommt zustande, indem der Kunde einen Antrag auf Kapitalanlage stellt, der von der Bank angenommen wird. Der Vertrag gilt als abgeschlossen, wenn der Kunde den Anlagebetrag auf das Kapitalanlagekonto einzahlt. Ma\u00DFgeblich ist der Zahlungseingang bei der Bank.'],
    ['\u00A73', 'Gesamtpreis und Konditionen der Finanzdienstleistung',
      'Ein gesonderter Preis f\u00FCr den Abschluss des Kapitalanlagevertrags wird grunds\u00E4tzlich nicht erhoben, sofern in den Vertragsunterlagen nichts Abweichendes bestimmt ist. Ma\u00DFgeblich sind die mit der Kapitalanlage verbundenen Konditionen, insbesondere Zinssatz, Laufzeit sowie sonstige preisrelevante Faktoren.'],
    ['\u00A74', 'Zus\u00E4tzliche Kosten und Steuern',
      'F\u00FCr Fest- und Flexgeldkonten fallen keine zus\u00E4tzlichen Kosten an. Es werden insbesondere keine Kontof\u00FChrungsgeb\u00FChren, Entgelte oder Provisionen erhoben. Die Verantwortung f\u00FCr die steuerliche Behandlung der Kapitalertr\u00E4ge liegt ausschlie\u00DFlich beim Kunden.'],
    ['\u00A75', 'Zahlungsmodalit\u00E4ten und Leistungserf\u00FCllung',
      'Der Anlagebetrag ist grunds\u00E4tzlich einmalig zu Beginn der Laufzeit vollst\u00E4ndig einzuzahlen; weitere Einzahlungen sind, mit Ausnahme von Flexgeldkonten und Ratensparvertr\u00E4gen, nicht m\u00F6glich. Die Leistungen der Bank erfolgen entsprechend den vertraglich vereinbarten Produktbedingungen.'],
    ['\u00A76', 'Verzinsung',
      'Die Verzinsung richtet sich nach dem vertraglich vereinbarten Zinssatz. Sowohl bei Festgeldanlagen als auch bei Flexgeldkonten ist der Zinssatz f\u00FCr die jeweils vereinbarte Laufzeit fest garantiert. Bei Flexgeldkonten steht das angelegte Kapital nach Ablauf der Festbindung t\u00E4glich zur freien Verf\u00FCgung.'],
    ['\u00A77', 'Vertragslaufzeit',
      'Die Mindestlaufzeit des Vertrags richtet sich nach der gew\u00E4hlten Anlageform. Festgeldanlagen sind durch eine feste Laufzeit gekennzeichnet, w\u00E4hrend Flexgeldanlagen eine h\u00F6here Flexibilit\u00E4t bieten.'],
    ['\u00A78', 'K\u00FCndigung',
      'Die K\u00FCndigungsbedingungen richten sich nach den jeweiligen Vertragsbestimmungen. Eine vorzeitige K\u00FCndigung kann, insbesondere bei Festgeldanlagen, zu Nachteilen f\u00FChren, wie etwa dem teilweisen oder vollst\u00E4ndigen Verlust von Zinsanspr\u00FCchen.'],
    ['\u00A79', 'Widerrufsrecht',
      'Dem Kunden steht ein gesetzliches Widerrufsrecht zu. Er ist berechtigt, seine Vertragserkl\u00E4rung innerhalb von 14 Tagen ohne Angabe von Gr\u00FCnden zu widerrufen. Die Einzelheiten zur Aus\u00FCbung des Widerrufsrechts ergeben sich aus der Widerrufsbelehrung.'],
    ['\u00A710', '\u00DCbertragung, Abtretung und Verpf\u00E4ndung',
      'Der Kunde kann Anspr\u00FCche auf R\u00FCckzahlung des Anlagebetrags sowie sonstige auf Geld gerichtete Anspr\u00FCche abtreten oder verpf\u00E4nden. Die Abtretung, Verpf\u00E4ndung oder \u00DCbertragung weiterer Rechte bedarf der Zustimmung der Bank.'],
    ['\u00A711', 'Anwendbares Recht',
      'F\u00FCr s\u00E4mtliche Vertragsbeziehungen gilt niederl\u00E4ndisches Recht. Die entsprechenden gesetzlichen Regelungen gew\u00E4hrleisten einen angemessenen Verbraucherschutz und transparente Verfahren im Falle von Streitigkeiten.'],
    ['\u00A712', 'Besteuerung und Quellensteuer',
      'Der Kunde ist f\u00FCr die ordnungsgem\u00E4\u00DFe Versteuerung seiner Kapitalertr\u00E4ge in seinem jeweiligen Steuerdomizil selbst verantwortlich. Die Bank f\u00FChrt gegebenenfalls Steuern nach Ma\u00DFgabe der gesetzlichen Vorschriften ab. Eine m\u00F6gliche Doppelbesteuerung richtet sich nach den jeweils anwendbaren Doppelbesteuerungsabkommen.'],
    ['\u00A713', 'Vertragssprache und Kommunikation',
      'Die Vertragssprache ist Deutsch. S\u00E4mtliche Informationen, Mitteilungen und \u00C4nderungen w\u00E4hrend der Vertragslaufzeit erfolgen in deutscher Sprache.'],
    ['\u00A714', 'Beschwerde- und Rechtsbehelfsverfahren',
      'Der Kunde hat die M\u00F6glichkeit, Beschwerden zun\u00E4chst direkt an die Bank zu richten. Sofern keine zufriedenstellende L\u00F6sung erzielt wird, kann ein au\u00DFergerichtliches Beschwerde- oder Schlichtungsverfahren bei einer zust\u00E4ndigen Ombudsstelle in Anspruch genommen werden.'],
    ['\u00A715', 'Kundenbetreuung und Service',
      'Zur Unterst\u00FCtzung der Kunden stellt die Bank umfassende Informations- und Serviceangebote zur Verf\u00FCgung, einschlie\u00DFlich eines FAQ-Bereichs sowie der M\u00F6glichkeit individueller Beratung. Fröhlich Vermögensberatung unterst\u00FCtzt als Vermittler bei der Kundenbetreuung.'],
    ['\u00A716', 'Einlagensicherung',
      'Die Bank ist dem gesetzlichen Einlagensicherungssystem der Niederlande (Depositogarantiestelsel) angeschlossen. Einlagen des Kunden sind bis zu einem Betrag von 100.000 EUR pro Einleger und pro Bank abgesichert. F\u00FCr Anleger mit Wohnsitz in Deutschland, \u00D6sterreich oder der Schweiz gilt, dass die Einlagensicherung im Sitzstaat der Bank erfolgt (Herkunftslandprinzip innerhalb der EU).'],
    ['\u00A717', 'Mitwirkungspflichten des Kunden',
      'Der Kunde ist verpflichtet, \u00C4nderungen seiner pers\u00F6nlichen oder steuerlichen Verh\u00E4ltnisse, insbesondere einen Bezug zu den Vereinigten Staaten von Amerika, unverz\u00FCglich mitzuteilen.'],
    ['\u00A718', 'Best\u00E4tigung der Unterlagen',
      'Mit Abschluss des Vertrags best\u00E4tigt der Kunde, das Produktinformationsblatt, die Allgemeinen Bedingungen f\u00FCr Kapitalanlagen, den Informationsbogen f\u00FCr Einleger, die Widerrufsbelehrung sowie die Datenschutzinformationen erhalten, gelesen und verstanden zu haben.'],
  ];

  terms.forEach(([num, title, content], idx) => {
    const contentLines = wrap(content, r, 4.5, CW - 6);
    const titleH = 5.5;
    const lineH = 4.8;
    const blockH = titleH + contentLines.length * lineH + 1;
    need(s, blockH + 1);
    if (idx % 2 === 0) {
      s.pg.drawRectangle({ x: ML - 2, y: s.y - blockH + 2, width: CW + 4, height: blockH, color: ZEBRA });
    }
    s.pg.drawText(`${num}  ${title}`, { x: ML, y: s.y, size: 4.8, font: b, color: NAVY });
    s.y -= titleH;
    contentLines.forEach(l => {
      s.pg.drawText(l, { x: ML + 4, y: s.y, size: 4.5, font: r, color: MID_TEXT });
      s.y -= lineH;
    });
    s.y -= 1;
  });

  // ---------------------------------------------------------------------------
  // Footers
  // ---------------------------------------------------------------------------
  const totalPages = pages.length;
  pages.forEach((p, i) => footer(p, i + 1, totalPages));

  const bytes = await doc.save();
  let bin = '';
  const u8 = new Uint8Array(bytes);
  const chunk = 8192;
  for (let i = 0; i < u8.length; i += chunk) {
    bin += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
  }
  return btoa(bin);
}
