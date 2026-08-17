import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { embedSignatureInPdf } from './embedSignatureInPdf';
import { prepareSignatureForPdf } from './signatureImage';
import { buildContractBarcodePayload } from './embedPdfBarcode';
import { drawKnabPdfPage1Header, drawKnabPdfContinuationHeader, embedKnabLogo } from './embedKnabPdfHeader';

const NAVY        = rgb(62/255, 74/255, 89/255);
const DARK_BLUE   = rgb(74/255, 86/255, 104/255);
const GRAY        = rgb(122/255, 141/255, 166/255);
const MID_GRAY    = rgb(90/255,  110/255, 135/255);
const BLACK       = rgb(0, 0, 0);
const WHITE       = rgb(1, 1, 1);
const LIGHT_BG    = rgb(244/255, 245/255, 247/255);
const BOX_BORDER  = rgb(168/255, 190/255, 211/255);
const RULE        = rgb(210/255, 220/255, 230/255);
const ACCENT      = rgb(232/255, 160/255, 32/255);
const ACCENT_LIGHT= rgb(255/255, 244/255, 224/255);
const WARN_BG     = rgb(253/255, 248/255, 232/255);
const WARN_BORDER = rgb(196/255, 162/255, 53/255);
const SECTION_BG  = rgb(236/255, 238/255, 241/255);
const ZEBRA       = rgb(247/255, 248/255, 250/255);

const PW = 595.28;
const PH = 841.89;
const ML = 46;
const MR = 46;
const CW = PW - ML - MR;
const FOOTER_H = 44;
const TOP_CONT = 30;

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
    else { cur = t; }
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

export async function generateKnabFlexgeldPdf(formData) {
  if (formData?.sig1_image) {
    formData.sig1_image = await prepareSignatureForPdf(formData.sig1_image, 320);
  }
  if (formData?.sig2_image) {
    formData.sig2_image = await prepareSignatureForPdf(formData.sig2_image, 320);
  }

  const doc = await PDFDocument.create();
  const r   = await doc.embedFont(StandardFonts.Helvetica);
  const b   = await doc.embedFont(StandardFonts.HelveticaBold);
  const f   = { r, b };
  const today = new Date().toLocaleDateString('de-DE');

  const c2 = ML + CW / 2 + 5;
  const fw = CW / 2 - 9;
  const RH = 24;
  const pages = [];
  const cNr = formData.contractNumber || `KNAB-${Date.now().toString().slice(-6)}`;
  const knabLogo = await embedKnabLogo(doc);
  const securityPayload = buildContractBarcodePayload({ contractNumber: cNr, product: 'flexgeld' });
  const layout = { PH, PW, ML, MR };

  function newPage(isCont = true) {
    const pg = doc.addPage([PW, PH]);
    pg.drawLine({ start: { x: ML - 6, y: PH - 18 }, end: { x: ML - 6, y: FOOTER_H + 8 }, thickness: 0.4, color: RULE });
    pg.drawLine({ start: { x: PW - MR + 6, y: PH - 18 }, end: { x: PW - MR + 6, y: FOOTER_H + 8 }, thickness: 0.4, color: RULE });
    pages.push(pg);
    let startY = PH - TOP_CONT;
    if (isCont) {
      drawKnabPdfContinuationHeader(pg, knabLogo, {
        fonts: f,
        layout,
        continuationTitle: 'Flexgeldvertrag (Fortsetzung)',
        today,
        securityPayload,
      });
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
    pg.drawText('Knab B.V. \u00B7 Thomas R. Malthusstraat 1-3 \u00B7 1066 JR Amsterdam \u00B7 Niederlande \u00B7 KvK-Nr.: 30100799',
      { x: ML, y: FOOTER_H - 14, size: 5, font: r, color: GRAY });
    pg.drawText('Flexgeldvertrag', { x: ML, y: FOOTER_H - 23, size: 5.5, font: b, color: NAVY });
    pg.drawText(`Seite ${n} von ${tot}`, { x: PW - MR - 48, y: FOOTER_H - 14, size: 5.5, font: r, color: GRAY });
  }

  function drawWrapped(state, x, text, fontFace, size, maxW, color, lineH) {
    wrap(text, fontFace, size, maxW).forEach(l => {
      need(state, lineH + 2);
      state.pg.drawText(l, { x, y: state.y, size, font: fontFace, color });
      state.y -= lineH;
    });
  }

  function secHdr(state, num, title) {
    state.y -= 10;
    const barH = 14;
    need(state, barH + 12);
    const barBottom = state.y;
    state.pg.drawRectangle({ x: ML, y: barBottom, width: CW, height: barH, color: SECTION_BG });
    state.pg.drawRectangle({ x: ML, y: barBottom, width: 16, height: barH, color: NAVY });
    state.pg.drawText(num, { x: ML + 5, y: barBottom + 4, size: 7, font: b, color: WHITE });
    const titleSize = title.length > 30 ? 6 : 7;
    state.pg.drawText(title.toUpperCase(), { x: ML + 22, y: barBottom + 4, size: titleSize, font: b, color: NAVY });
    state.pg.drawLine({ start: { x: ML, y: barBottom + barH }, end: { x: PW - MR, y: barBottom + barH }, thickness: 0.3, color: BOX_BORDER });
    state.y = barBottom - 8;
  }

  function fld(pg, x, y, label, value, w) {
    const valStr = truncVal(value || '\u2014', b, 7.5, w - 2);
    pg.drawText(label, { x, y, size: 5, font: r, color: GRAY });
    pg.drawText(valStr, { x, y: y - 9, size: 7.5, font: b, color: BLACK });
    pg.drawLine({ start: { x, y: y - 14 }, end: { x: x + w, y: y - 14 }, thickness: 0.3, color: RULE });
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

  function fld4(state, l1, v1, l2, v2, l3, v3, l4, v4) {
    need(state, RH);
    const icw = CW / 4 - 5;
    fld(state.pg, ML,              state.y, l1, v1, icw);
    fld(state.pg, ML + CW / 4,    state.y, l2, v2, icw);
    fld(state.pg, ML + CW / 2,    state.y, l3, v3, icw);
    fld(state.pg, ML + CW * 3 / 4, state.y, l4, v4, icw);
    state.y -= RH;
  }

  function chk(state, text, checked) {
    const LH = 7.5;
    const lines = wrap(text, r, 6, CW - 20);
    need(state, lines.length * LH + 6);
    const bx = ML + 3;
    state.pg.drawRectangle({ x: bx, y: state.y - 1, width: 8, height: 8, borderColor: NAVY, borderWidth: 0.6, color: WHITE });
    if (checked) {
      state.pg.drawLine({ start: { x: bx + 1.5, y: state.y + 4 }, end: { x: bx + 3.5, y: state.y + 1 }, thickness: 1.2, color: ACCENT });
      state.pg.drawLine({ start: { x: bx + 3.5, y: state.y + 1 }, end: { x: bx + 7, y: state.y + 6 }, thickness: 1.2, color: ACCENT });
    }
    lines.forEach((l, i) => {
      state.pg.drawText(l, { x: bx + 14, y: state.y - (i * LH), size: 6, font: r, color: BLACK });
    });
    state.y -= (lines.length * LH) + 4;
  }

  function infoBox(state, text, borderColor, bgColor, textColor) {
    const lines = wrap(text, r, 5.2, CW - 20);
    const bH = 10 + lines.length * 6.5;
    need(state, bH + 4);
    const bY = state.y - bH;
    state.pg.drawRectangle({ x: ML, y: bY, width: CW, height: bH, borderColor, borderWidth: 0.5, color: bgColor });
    state.pg.drawLine({ start: { x: ML, y: bY + bH }, end: { x: ML, y: bY }, thickness: 2.5, color: borderColor });
    let ty = state.y - 6;
    lines.forEach(l => { state.pg.drawText(l, { x: ML + 10, y: ty, size: 5.2, font: r, color: textColor }); ty -= 6.5; });
    state.y = bY - 10;
  }

  function warnBox(state, title, text) {
    const tLines = wrap(title, b, 5.5, CW - 24);
    const cLines = wrap(text, r, 5, CW - 24);
    const bH = 10 + (tLines.length + cLines.length) * 6.5;
    need(state, bH + 4);
    const bY = state.y - bH;
    state.pg.drawRectangle({ x: ML, y: bY, width: CW, height: bH, color: WARN_BG });
    state.pg.drawLine({ start: { x: ML, y: bY + bH }, end: { x: ML, y: bY }, thickness: 3.5, color: WARN_BORDER });
    let ty = state.y - 6;
    tLines.forEach(l => { state.pg.drawText(l, { x: ML + 11, y: ty, size: 5.5, font: b, color: rgb(58/255, 48/255, 0) }); ty -= 6.5; });
    cLines.forEach(l => { state.pg.drawText(l, { x: ML + 11, y: ty, size: 5, font: r, color: rgb(90/255, 74/255, 16/255) }); ty -= 6.5; });
    state.y = bY - 10;
  }

  function labelBar(state, text) {
    state.y -= 4;
    const barH = 13;
    need(state, barH + 8);
    const barBottom = state.y;
    state.pg.drawRectangle({ x: ML, y: barBottom, width: CW, height: barH, color: LIGHT_BG, borderColor: BOX_BORDER, borderWidth: 0.3 });
    state.pg.drawText(text, { x: ML + 7, y: barBottom + 4, size: 6.5, font: b, color: NAVY });
    state.y = barBottom - 6;
  }

  async function sigBox(state, descText, dateVal, sigImage, sigLabel, compact = false) {
    const descSize = compact ? 4.2 : 5;
    const descLineH = compact ? 4.8 : 6.2;
    const baseH = compact ? 32 : 54;
    const sigMaxH = compact ? 22 : 36;
    const sigDownShift = compact ? 10 : 8;
    const bottomGap = compact ? 4 : 12;
    const descLines = wrap(descText, r, descSize, CW - 22);
    const bH = baseH + descLines.length * descLineH;
    if (!compact) need(state, bH + 14);
    const bY = state.y - bH;
    state.pg.drawRectangle({ x: ML, y: bY, width: CW, height: bH, borderColor: BOX_BORDER, borderWidth: 0.6, color: LIGHT_BG });
    let ty = state.y - 6;
    descLines.forEach(l => { state.pg.drawText(l, { x: ML + 10, y: ty, size: descSize, font: r, color: DARK_BLUE }); ty -= descLineH; });
    ty -= compact ? 3 : 5;
    const c1 = ML + 10;
    const c2x = ML + CW / 2 + 10;
    const lw = CW / 2 - 26;
    state.pg.drawText(dateVal || '', { x: c1, y: ty + 2, size: compact ? 6.5 : 7, font: r, color: BLACK });
    state.pg.drawLine({ start: { x: c1, y: ty }, end: { x: c1 + lw, y: ty }, thickness: 0.5, color: DARK_BLUE });
    state.pg.drawText('Ort, Datum', { x: c1, y: ty - 8, size: 4.5, font: r, color: GRAY });
    state.pg.drawLine({ start: { x: c2x, y: ty }, end: { x: c2x + lw, y: ty }, thickness: 0.5, color: DARK_BLUE });
    await embedSignatureInPdf(doc, state.pg, sigImage, c2x, ty, lw, sigMaxH, sigDownShift);
    state.pg.drawText(`Unterschrift | ${sigLabel}`, { x: c2x, y: ty - 10, size: 4.5, font: r, color: GRAY });
    state.y = bY - bottomGap;
  }

  async function staticSigBox(state, descText, sigLabel, compact = false) {
    await sigBox(state, descText, '', null, sigLabel, compact);
  }

  // ══════════════════════════════════════════════════════════════════
  // PAGE 1 — Header
  // ══════════════════════════════════════════════════════════════════
  const pg1 = doc.addPage([PW, PH]);
  pages.push(pg1);
  pg1.drawLine({ start: { x: ML - 6, y: PH - 62 }, end: { x: ML - 6, y: FOOTER_H + 8 }, thickness: 0.4, color: RULE });
  pg1.drawLine({ start: { x: PW - MR + 6, y: PH - 62 }, end: { x: PW - MR + 6, y: FOOTER_H + 8 }, thickness: 0.4, color: RULE });

  const startY = await drawKnabPdfPage1Header(pg1, doc, {
    fonts: f,
    layout: { PH, PW, ML, MR },
    productLine1: 'Flexgeldanlage',
    contractNumber: cNr,
    today,
    logoEmbed: knabLogo,
    securityPayload,
  });

  let s = { pg: pg1, y: startY };

  // Introduction
  s.pg.drawText('Flexgeldvertrag', { x: ML, y: s.y, size: 14, font: b, color: NAVY });
  s.pg.drawLine({ start: { x: ML, y: s.y - 4 }, end: { x: ML + 72, y: s.y - 4 }, thickness: 2.2, color: ACCENT });
  s.y -= 18;
  drawWrapped(s, ML, 'zwischen dem Anleger [nachfolgend \u201EAnleger\u201C genannt] und Knab B.V. [nachfolgend \u201EBank\u201C genannt], vermittelt durch Kapitalmitte.', r, 7, CW, MID_GRAY, 9);
  s.y -= 2;
  drawWrapped(s, ML, 'Dieses Dokument best\u00E4tigt die Vereinbarung zwischen dem oben genannten Anleger und der Knab B.V. \u00FCber eine Flexgeldanlage zu den nachfolgend aufgef\u00FChrten Bedingungen. Die Flexgeldanlage hat eine Gesamtlaufzeit von 12 Monaten, davon die ersten 3 Monate fest und die folgenden 9 Monate flexibel.', r, 7, CW, BLACK, 9);
  s.y -= 4;

  // ══════════════════════════════════════════════════════════════════
  // SECTION 1 — Kundendaten
  // ══════════════════════════════════════════════════════════════════
  s.y -= 6;
  secHdr(s, '1', 'Kundendaten');

  // ── Helper: 3-column field row ──
  function fld3(state, l1, v1, l2, v2, l3, v3) {
    need(state, RH);
    const w3 = (CW - 24) / 3;
    const mx = ML + 6;
    fld(state.pg, mx,              state.y, l1, v1, w3);
    fld(state.pg, mx + w3 + 6,    state.y, l2, v2, w3);
    fld(state.pg, mx + (w3 + 6) * 2, state.y, l3, v3, w3);
    state.y -= RH;
  }

  // ── Helper: Name row with gender checkboxes ──
  function nameGenderRow(state, nameVal, salutation) {
    need(state, RH);
    const nameW = CW * 0.52;
    fld(state.pg, ML + 6, state.y, 'Name, Vorname', nameVal, nameW);
    const gx = ML + nameW + 24;
    const gy = state.y - 6;
    state.pg.drawRectangle({ x: gx, y: gy, width: 7, height: 7, borderColor: NAVY, borderWidth: 0.5, color: WHITE });
    if (salutation === 'frau') state.pg.drawText('X', { x: gx + 1.5, y: gy + 1, size: 5, font: b, color: NAVY });
    state.pg.drawText('Frau', { x: gx + 10, y: gy + 1, size: 5.5, font: r, color: BLACK });
    const hx = gx + 42;
    state.pg.drawRectangle({ x: hx, y: gy, width: 7, height: 7, borderColor: NAVY, borderWidth: 0.5, color: WHITE });
    if (salutation === 'herr') state.pg.drawText('X', { x: hx + 1.5, y: gy + 1, size: 5, font: b, color: NAVY });
    state.pg.drawText('Herr', { x: hx + 10, y: gy + 1, size: 5.5, font: r, color: BLACK });
    state.y -= RH;
  }

  // ── Helper: Legitimation sub-section ──
  function drawLegitimation(state, idType, idNumber, idIssuedDate, idValidUntil, idAuthority) {
    state.y -= 10;
    need(state, 22 + RH);
    const labelY = state.y;
    state.pg.drawText('Legitimiert durch:', { x: ML + 6, y: labelY, size: 6.5, font: b, color: NAVY });
    const lx = ML + 91;
    const ly = labelY - 2;
    state.pg.drawRectangle({ x: lx, y: ly, width: 7, height: 7, borderColor: NAVY, borderWidth: 0.5, color: WHITE });
    if (idType === 'personalausweis') state.pg.drawText('X', { x: lx + 1.5, y: ly + 1, size: 5, font: b, color: NAVY });
    state.pg.drawText('Personalausweis', { x: lx + 10, y: ly + 1, size: 6.5, font: r, color: BLACK });
    const rx = lx + 100;
    state.pg.drawRectangle({ x: rx, y: ly, width: 7, height: 7, borderColor: NAVY, borderWidth: 0.5, color: WHITE });
    if (idType === 'reisepass') state.pg.drawText('X', { x: rx + 1.5, y: ly + 1, size: 5, font: b, color: NAVY });
    state.pg.drawText('Reisepass', { x: rx + 10, y: ly + 1, size: 6.5, font: r, color: BLACK });
    state.y = labelY - 18;
    fld4(state, 'Ausweis-Nr.', idNumber, 'ausgestellt am', fmt(idIssuedDate), 'g\u00FCltig bis', fmt(idValidUntil), 'Beh\u00F6rde/Ort', idAuthority);
  }

  // ── Helper: Full investor section (box + legitimation) ──
  function drawInvestorSection(state, title, isOptional, d) {
    const BOX_PAD = 6;
    const TITLE_H = 22;
    const ROWS_H = RH * 4;
    const BOX_H = BOX_PAD + TITLE_H + ROWS_H + BOX_PAD;
    const LEG_H = 16 + RH;
    need(state, BOX_H + 4 + LEG_H + 4);

    const boxTop = state.y;
    const boxBot = boxTop - BOX_H;

    state.pg.drawRectangle({ x: ML, y: boxBot, width: CW, height: BOX_H, borderColor: BOX_BORDER, borderWidth: 0.6, color: WHITE });
    state.pg.drawLine({ start: { x: ML, y: boxTop - BOX_PAD - TITLE_H + 8 }, end: { x: PW - MR, y: boxTop - BOX_PAD - TITLE_H + 8 }, thickness: 0.25, color: RULE });

    let ty = boxTop - BOX_PAD - 10;
    state.pg.drawText(title, { x: ML + 8, y: ty, size: 7.5, font: b, color: NAVY });
    if (isOptional) {
      const tw = b.widthOfTextAtSize(title, 7.5);
      state.pg.drawText('(optional)', { x: ML + 12 + tw, y: ty + 0.5, size: 6, font: r, color: GRAY });
    }

    state.y = boxTop - BOX_PAD - TITLE_H;
    nameGenderRow(state, d.fullName, d.salutation);
    fld3(state, 'Geburtsort', d.birthPlace, 'Geburtsdatum', fmt(d.birthDate), 'Staatsangeh\u00F6rigkeit', d.nationality);
    fld3(state, 'Stra\u00DFe/Nr.', d.street, 'PLZ/Ort', d.postalCode, 'E-Mail-Adresse', d.email);
    fld3(state, 'Telefon', d.phone, 'Mobile', d.mobile, 'Steueridentifikationsnummer', d.taxId);

    state.y = boxBot - 12;
    drawLegitimation(state, d.idType, d.idNumber, d.idIssuedDate, d.idValidUntil, d.idAuthority);
  }

  // ── ERSTER ANLEGER ──
  drawInvestorSection(s, 'Erster Anleger', false, {
    salutation: formData.salutation,
    fullName:    formData.fullName,
    birthPlace:  formData.birthPlace,
    birthDate:   formData.birthDate,
    nationality: formData.nationality,
    street:      formData.street,
    postalCode:  formData.postalCode,
    email:       formData.email,
    phone:       formData.phone,
    mobile:      formData.mobile,
    taxId:       formData.taxId,
    idType:      formData.idType,
    idNumber:    formData.idNumber,
    idIssuedDate: formData.idIssuedDate,
    idValidUntil: formData.idValidUntil,
    idAuthority: formData.idAuthority,
  });

  // ── ZWEITER ANLEGER (immer g\u00f6sterilir) ──
  s.y -= 4;
  drawInvestorSection(s, 'Zweiter Anleger bzw. Bevollm\u00E4chtigte Person', true, {
    salutation: formData.s_salutation,
    fullName:    formData.s_fullName,
    birthPlace:  formData.s_birthPlace,
    birthDate:   formData.s_birthDate,
    nationality: formData.s_nationality,
    street:      formData.s_street,
    postalCode:  formData.s_postalCode,
    email:       formData.s_email,
    phone:       formData.s_phone,
    mobile:      formData.s_mobile || '',
    taxId:       formData.s_taxId || '',
    idType:      formData.s_idType || '',
    idNumber:    formData.s_idNumber || '',
    idIssuedDate: formData.s_idIssuedDate || '',
    idValidUntil: formData.s_idValidUntil || '',
    idAuthority: formData.s_idAuthority || '',
  });

  // ══════════════════════════════════════════════════════════════════
  // SECTION 2 — Flexgeldkonditionen
  // ══════════════════════════════════════════════════════════════════
  s.y -= 4;
  secHdr(s, '2', 'Angaben zur Flexgeldanlage');
  labelBar(s, 'Flexgeldkonditionen');

  const amt = formData.investmentAmountDisplay ? `${formData.investmentAmountDisplay} EUR` : '';
  fld4(s,
    'Anlagebetrag (EUR)', amt,
    'Zinssatz p.a.',      formData.interestRate || '',
    'Laufzeit',           formData.term || '',
    'Willkommensbonus',   formData.welcomeBonus ? `${formData.welcomeBonus} EUR` : ''
  );

  const zpLabels = { quarterly: 'viertelj\u00E4hrlich', 'semi-annual': 'halbj\u00E4hrlich', maturity: 'am Laufzeitende' };
  const zp = zpLabels[formData.interestPayment] || '—';
  labelBar(s, `Zinsgutschrift: ${zp}`);

  infoBox(s, 'Bitte beachten Sie, dass der Mindestanlagebetrag 10.000,00 EUR und der maximale Anlagebetrag 1.000.000,00 EUR betr\u00E4gt. Die Flexgeldanlage erfolgt f\u00FCr die vertraglich vereinbarte Laufzeit als teilweise fest angelegte Anlage. Eine vorzeitige Verf\u00FCgung \u00FCber den Anlagebetrag ist in den ersten 3 Monaten grunds\u00E4tzlich ausgeschlossen. Nach Ablauf der Gesamtlaufzeit wird der Gesamtbetrag automatisch auf das von Ihnen benannte Referenzkonto \u00FCberwiesen.', BOX_BORDER, LIGHT_BG, DARK_BLUE);
  s.y -= 1;
  warnBox(s, 'Wichtiger Hinweis:', 'Die Gew\u00E4hrung des Willkommensbonus setzt voraus, dass zum Zeitpunkt der Kontoer\u00F6ffnung keine bestehende Gesch\u00E4ftsbeziehung in Form eines Kontos bei der Knab B.V. vorliegt. Der Bonus wird ausschlie\u00DFlich Neukunden gew\u00E4hrt, die bislang kein Konto bei der Knab B.V. unterhalten haben. Bestehende oder ehemalige Kontoverbindungen k\u00F6nnen zum Ausschluss von der Bonusgew\u00E4hrung f\u00FChren.');

  // ══════════════════════════════════════════════════════════════════
  // SECTION 3 — Referenzkonto
  // ══════════════════════════════════════════════════════════════════
  secHdr(s, '3', 'Angaben zum Referenzkonto f\u00FCr Zins- und R\u00FCckzahlung');
  fldFull(s, 'Kontoinhaber', formData.accountHolder);
  fldFull(s, 'IBAN', formData.iban);
  fldRow(s, 'BIC', formData.bic, 'Kreditinstitut', formData.bankName);
  infoBox(s, 'Das Referenzkonto dient als Abwicklungskonto f\u00FCr die Flexgeldanlage. \u00DCber dieses Konto erfolgen sowohl die Einzahlung des Anlagebetrags als auch die Auszahlung der Zinsen und die R\u00FCckf\u00FChrung des Kapitals bei F\u00E4lligkeit. Auszahlungen werden ausschlie\u00DFlich auf das hinterlegte Referenzkonto vorgenommen.', BOX_BORDER, LIGHT_BG, DARK_BLUE);

  // ══════════════════════════════════════════════════════════════════
  // SECTION 4 — Allgemeine Vertragsbedingungen
  // ══════════════════════════════════════════════════════════════════
  secHdr(s, '4', 'Allgemeine Vertragsbedingungen');

  const allTerms = [
    ['\u00A7 1 Vertragsgegenstand', 'Der Anleger legt \u00FCber den Vermittler Kapitalmitte bei der Bank einen Flexgeldbetrag f\u00FCr eine Gesamtlaufzeit von 12 Monaten zu einem festen Zinssatz an. Die ersten 3 Monate sind fest angelegt und k\u00F6nnen w\u00E4hrend dieser Zeit weder gek\u00FCndigt noch verf\u00FCgt werden. Ab dem Beginn des 4. Monats wird das Guthaben flexibel, sodass der Anleger jederzeit berechtigt ist, das gesamte Guthaben oder Teile davon abzurufen.'],
    ['\u00A7 2 Zustandekommen des Vertrags', 'Der Vertrag kommt zustande, indem der Kunde ein bindendes Angebot durch Unterzeichnung des Antrags abgibt. Der Vertrag wird wirksam, sobald das Angebot gepr\u00FCft, gegengezeichnet und der Anlagebetrag eingezahlt wurde.'],
    ['\u00A7 3 Legitimationspr\u00FCfung', 'Die Bank \u00FCberpr\u00FCft die Identit\u00E4t des Anlegers gem\u00E4\u00DF GwG. Die Identifikation erfolgt durch einen amtlichen Lichtbildausweis (Personalausweis oder Reisepass); bei juristischen Personen sind Handelsregisterausz\u00FCge und Vertretungsnachweise vorzulegen.'],
    ['\u00A7 4 Zinsen und Verzinsung', 'Der Flexgeldbetrag wird f\u00FCr die ersten 3 Monate zu dem im Antrag vereinbarten festen Zinssatz verzinst. Dieser Zinssatz ist w\u00E4hrend dieser Zeit garantiert und unabh\u00E4ngig von Marktzinsschwankungen. Ab dem 4. Monat bleibt der Zinssatz weiterhin unver\u00E4ndert fest und garantiert, auch wenn das Guthaben jederzeit verf\u00FCgbar ist. Die Zinsberechnung erfolgt nach der Methode act/360.'],
    ['\u00A7 5 Auszahlung und F\u00E4lligkeit', 'Die Zinsen f\u00FCr die ersten 3 Monate sowie das jeweilige Guthaben werden dem im Vertrag benannten Referenzkonto gutgeschrieben \u2013 entweder bei einem Abruf ab dem 4. Monat oder nach Ablauf der gesamten Laufzeit von 12 Monaten. Eine automatische Verl\u00E4ngerung der Flexgeldanlage findet nicht statt.'],
    ['\u00A7 6 Vorzeitige Verf\u00FCgung', 'In den ersten 3 Monaten der Gesamtlaufzeit ist eine vorzeitige Verf\u00FCgung \u00FCber das Flexgeld grunds\u00E4tzlich nicht m\u00F6glich. Ab dem 4. Monat kann der Anleger das Guthaben jederzeit ganz oder teilweise abrufen. Der abgerufene Betrag wird unverz\u00FCglich, sp\u00E4testens jedoch innerhalb von drei Bankarbeitstagen, auf das Referenzkonto \u00FCberwiesen.'],
    ['\u00A7 7 Widerrufsrecht', 'Der Anleger kann seine Vertragserkl\u00E4rung innerhalb von 14 Tagen ohne Angabe von Gr\u00FCnden in Textform widerrufen. Die Frist beginnt nach Erhalt des Vertrags und aller vertragsrelevanten Informationen. Zur Wahrung der Frist gen\u00FCgt die rechtzeitige Absendung des Widerrufs an kundenservice@kapitalmitte.com.'],
    ['\u00A7 8 Folgen des Widerrufs', 'Im Falle eines wirksamen Widerrufs sind die beiderseits empfangenen Leistungen zur\u00FCckzugew\u00E4hren. Die Bank erstattet alle Zahlungen unverz\u00FCglich, sp\u00E4testens innerhalb von 14 Tagen. Bereits gutgeschriebene Zinsen werden anteilig berechnet und ausgezahlt.'],
    ['\u00A7 9 Einlagensicherung', 'Die Einlagen bei der Bank sind durch die gesetzliche Einlagensicherung bis zu 100.000 \u20AC pro Kunde und Kreditinstitut abgesichert; bei Gemeinschaftskonten betr\u00E4gt die Absicherung 200.000 \u20AC. Die Bank ist Mitglied im Einlagensicherungsfonds des Bundesverbandes deutscher Banken e.V.'],
    ['\u00A7 10 Steuerliche Behandlung', 'Kapitalertr\u00E4ge unterliegen der Abgeltungssteuer in H\u00F6he von 25 % zuz\u00FCglich Solidarit\u00E4tszuschlag (5,5 %) sowie gegebenenfalls Kirchensteuer. Die Bank f\u00FChrt Steuern automatisch ab, sofern kein ausreichender Freistellungsauftrag oder eine NV-Bescheinigung vorliegt. Der Sparer-Pauschbetrag betr\u00E4gt 1.000 \u20AC f\u00FCr Alleinstehende bzw. 2.000 \u20AC f\u00FCr Verheiratete.'],
    ['\u00A7 11 Datenschutz', 'Die Bank verarbeitet personenbezogene Daten zur Vertragserf\u00FCllung sowie zur Erf\u00FCllung gesetzlicher Pflichten, insbesondere nach GwG, KWG und steuerrechtlichen Vorschriften. Es gelten die Bestimmungen der DSGVO und des BDSG. Der Anleger hat das Recht auf Auskunft, Berichtigung, L\u00F6schung, Einschr\u00E4nkung der Verarbeitung sowie Daten\u00FCbertragbarkeit.'],
    ['\u00A7 12 Preise und Kosten', 'Die Einrichtung und F\u00FChrung des Flexgeldkontos ist geb\u00FChrenfrei.'],
    ['\u00A7 13 Erf\u00FCllungsort, Gerichtsstand', 'Es gilt ausschlie\u00DFlich deutsches Recht. Erf\u00FCllungsort und Gerichtsstand ist Amsterdam, soweit gesetzlich zul\u00E4ssig.'],
    ['\u00A7 14 Vertragssprache', 'Vertragssprache ist Deutsch. Neben diesen Bedingungen gelten die Allgemeinen Gesch\u00E4ftsbedingungen der Knab B.V. sowie die Sonderbedingungen f\u00FCr den Zahlungsverkehr; bei Widerspr\u00FCchen haben diese Flexgeldbedingungen Vorrang.'],
    ['\u00A7 15 Best\u00E4tigung des Anlegers', 'Der Anleger versichert, die Gesch\u00E4ftsbeziehung ausschlie\u00DFlich im eigenen wirtschaftlichen Interesse zu begr\u00FCnden. \u00C4nderungen zu pers\u00F6nlichen Angaben oder zur Eigentums- und Kontrollstruktur sind unverz\u00FCglich mitzuteilen, insbesondere gem\u00E4\u00DF \u00A7 11 Abs. 6 GwG.'],
  ];

  allTerms.forEach(([title, content], idx) => {
    const contentLines = wrap(content, r, 5.0, CW - 8);
    const titleH = 6.2;
    const lineH = 5.4;
    const blockH = titleH + contentLines.length * lineH + 1.5;
    // Page-break only from page 1 → 2; never open a 3rd page for § terms
    if (pages.length < 2) need(s, blockH);
    if (idx % 2 === 0) {
      s.pg.drawRectangle({ x: ML - 2, y: s.y - blockH + 2, width: CW + 4, height: blockH, color: ZEBRA });
    }
    s.pg.drawText(title, { x: ML, y: s.y, size: 5.4, font: b, color: NAVY });
    s.y -= titleH;
    contentLines.forEach(l => {
      s.pg.drawText(l, { x: ML + 5, y: s.y, size: 5.0, font: r, color: rgb(40/255, 55/255, 75/255) });
      s.y -= lineH;
    });
    s.y -= 1.8;
  });

  // ══════════════════════════════════════════════════════════════════
  // SECTION 5 — Best\u00E4tigungen und Erkl\u00E4rungen (+ Abschnitt 6 auf Seite 2)
  // ══════════════════════════════════════════════════════════════════
  const dsTextPreview = 'Ich best\u00E4tige, die Datenschutzhinweise der Bank (abrufbar unter www.knab.nl/datenschutz) zur Kenntnis genommen zu haben und willige ein, dass meine personenbezogenen Daten im Einklang mit den Bestimmungen der Datenschutz-Grundverordnung (DSGVO) sowie des Bundesdatenschutzgesetzes (BDSG) zum Zwecke der Durchf\u00FChrung und Abwicklung der Gesch\u00E4ftsbeziehung, insbesondere der Kontof\u00FChrung, sowie zur Erf\u00FCllung gesetzlicher Verpflichtungen, insbesondere nach geldw\u00E4scherechtlichen Vorschriften, verarbeitet werden. Mir ist bekannt, dass eine \u00DCbermittlung meiner personenbezogenen Daten an Dritte nur erfolgt, soweit dies zur Durchf\u00FChrung dieses Vertrages erforderlich ist, eine gesetzliche Verpflichtung besteht oder ich ausdr\u00FCcklich eingewilligt habe.';
  if (pages.length < 2) {
    const ns = newPage(true);
    s.pg = ns.pg;
    s.y = ns.y;
  }
  // stay on current page for §5–§6 (avoid orphan page 3)

  secHdr(s, '5', 'Best\u00E4tigungen und Erkl\u00E4rungen');

  // ── Empfangs- und Kenntnisnahmebest\u00E4tigung (bordered box) ──
  const empfItems = [
    ['Ich best\u00E4tige den Erhalt und die Kenntnisnahme der Widerrufsbelehrung.', formData.withdrawalRightAccepted],
    ['Ich best\u00E4tige den Erhalt und die Kenntnisnahme der Informationen zur Einlagensicherung.', formData.depositProtectionAccepted],
    ['Ich best\u00E4tige den Erhalt und die Kenntnisnahme der Produktinformationen.', formData.productInfoAccepted],
    ['Ich best\u00E4tige den Erhalt und die Kenntnisnahme der Allgemeinen Gesch\u00E4ftsbedingungen (AGB).', formData.agbAccepted],
  ];
  const empfTitleH = 14;
  const empfInstrH = 10;
  const empfRowH = 13;
  const empfBoxH = empfTitleH + empfInstrH + empfItems.length * empfRowH + 6;
  if (pages.length < 2) need(s, empfBoxH + 4);

  const empfTop = s.y;
  const empfBot = empfTop - empfBoxH;
  s.pg.drawRectangle({ x: ML, y: empfBot, width: CW, height: empfBoxH, borderColor: BOX_BORDER, borderWidth: 0.6, color: WHITE });

  let ey = empfTop - 10;
  s.pg.drawText('Empfangs- und Kenntnisnahmebest\u00E4tigung', { x: ML + 8, y: ey, size: 7, font: b, color: NAVY });
  s.pg.drawLine({ start: { x: ML, y: empfTop - empfTitleH }, end: { x: PW - MR, y: empfTop - empfTitleH }, thickness: 0.25, color: RULE });
  ey -= empfTitleH;
  s.pg.drawText('Bitte Zutreffendes ankreuzen:', { x: ML + 8, y: ey, size: 5, font: r, color: MID_GRAY });
  ey -= empfInstrH;

  empfItems.forEach(([text, checked], i) => {
    if (i > 0) {
      s.pg.drawLine({ start: { x: ML + 6, y: ey + empfRowH - 1 }, end: { x: PW - MR - 6, y: ey + empfRowH - 1 }, thickness: 0.2, color: RULE });
    }
    const bx = ML + 10;
    const by = ey + 3;
    s.pg.drawRectangle({ x: bx, y: by, width: 6, height: 6, borderColor: NAVY, borderWidth: 0.5, color: WHITE });
    if (checked) {
      s.pg.drawLine({ start: { x: bx + 1.2, y: by + 3.5 }, end: { x: bx + 2.8, y: by + 0.8 }, thickness: 1, color: ACCENT });
      s.pg.drawLine({ start: { x: bx + 2.8, y: by + 0.8 }, end: { x: bx + 5.5, y: by + 5 }, thickness: 1, color: ACCENT });
    }
    s.pg.drawText(text, { x: bx + 12, y: by + 0.5, size: 5.4, font: r, color: BLACK });
    ey -= empfRowH;
  });
  s.y = empfBot - 6;

  // ── Datenschutz, Datenverarbeitungsklausel (bordered box) ──
  const dsText = dsTextPreview;
  const dsLines = wrap(dsText, r, 5.0, CW - 28);
  const dsTitleH = 14;
  const dsContentH = dsLines.length * 6 + 6;
  const dsBoxH = dsTitleH + dsContentH + 6;
  if (pages.length < 2) need(s, dsBoxH + 4);

  const dsTop = s.y;
  const dsBot = dsTop - dsBoxH;
  s.pg.drawRectangle({ x: ML, y: dsBot, width: CW, height: dsBoxH, borderColor: BOX_BORDER, borderWidth: 0.6, color: WHITE });
  s.pg.drawLine({ start: { x: ML, y: dsTop - dsTitleH }, end: { x: PW - MR, y: dsTop - dsTitleH }, thickness: 0.25, color: RULE });

  let dy = dsTop - 10;
  s.pg.drawText('Datenschutz, Datenverarbeitungsklausel', { x: ML + 8, y: dy, size: 7, font: b, color: NAVY });
  dy -= dsTitleH;

  const dsBx = ML + 10;
  const dsBy = dy + 3;
  s.pg.drawRectangle({ x: dsBx, y: dsBy, width: 6, height: 6, borderColor: NAVY, borderWidth: 0.5, color: WHITE });
  if (formData.privacyAccepted) {
    s.pg.drawLine({ start: { x: dsBx + 1.2, y: dsBy + 3.5 }, end: { x: dsBx + 2.8, y: dsBy + 0.8 }, thickness: 1, color: ACCENT });
    s.pg.drawLine({ start: { x: dsBx + 2.8, y: dsBy + 0.8 }, end: { x: dsBx + 5.5, y: dsBy + 5 }, thickness: 1, color: ACCENT });
  }
  let dty = dy + 0.5;
  dsLines.forEach(l => {
    s.pg.drawText(l, { x: dsBx + 12, y: dty, size: 5.0, font: r, color: rgb(40/255, 55/255, 75/255) });
    dty -= 6;
  });
  s.y = dsBot - 4;

  // ══════════════════════════════════════════════════════════════════
  // SECTION 6 — Unterschriften (kompakt, auf Seite 2)
  // ══════════════════════════════════════════════════════════════════
  s.y -= 2;
  secHdr(s, '6', 'Unterschriften');

  s.pg.drawText('Erster Anleger', { x: ML, y: s.y, size: 6, font: b, color: NAVY });
  s.y -= 6;
  await sigBox(s, 'Mit seiner Unterschrift best\u00E4tigt der Kunde die Richtigkeit und Vollst\u00E4ndigkeit der gemachten Angaben sowie die Kenntnisnahme und rechtsverbindliche Anerkennung s\u00E4mtlicher vorstehender Vertragsbedingungen.', formData.sig1_date, formData.sig1_image, 'Erster Anleger', true);

  s.y -= 4;
  s.pg.drawText('Zweiter Anleger bzw. Bevollm\u00E4chtigte Person', { x: ML, y: s.y, size: 6, font: b, color: NAVY });
  s.y -= 6;
  await sigBox(s, 'Mit seiner Unterschrift best\u00E4tigt der Kunde bzw. der Bevollm\u00E4chtigte die Richtigkeit und Vollst\u00E4ndigkeit der gemachten Angaben sowie die Kenntnisnahme und rechtsverbindliche Anerkennung s\u00E4mtlicher vorstehender Vertragsbedingungen. Im Falle einer Vertretung erfolgt die Unterzeichnung im Rahmen der erteilten Vertretungsbefugnis.', formData.sig2_date, formData.sig2_image, 'Zweiter Anleger', true);

  s.y -= 4;
  s.pg.drawText('Aufnahmebest\u00E4tigung der Knab B.V.', { x: ML, y: s.y, size: 6, font: b, color: NAVY });
  s.y -= 6;
  await staticSigBox(s, 'Die Knab B.V. best\u00E4tigt hiermit die Annahme des Kundenantrags. Die Begr\u00FCndung der Gesch\u00E4ftsbeziehung erfolgt vorbehaltlich der abschlie\u00DFenden Pr\u00FCfung s\u00E4mtlicher erforderlicher Unterlagen sowie der Einhaltung gesetzlicher und aufsichtsrechtlicher Anforderungen.', 'Knab B.V.', true);

  // Footers
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
