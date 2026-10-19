import { rgb } from 'pdf-lib';
import { drawPdfHeaderSecurityMatrix } from './embedPdfBarcode';

export const BBVA_PDF_NAVY = rgb(26 / 255, 58 / 255, 107 / 255);
export const BBVA_PDF_ACCENT = rgb(0 / 255, 120 / 255, 212 / 255);
export const BBVA_PDF_WHITE = rgb(1, 1, 1);
export const BBVA_PDF_WHITE_MUTED = rgb(0.78, 0.85, 0.92);
export const BBVA_PDF_WHITE_DIM = rgb(0.55, 0.65, 0.78);

const LOGO_PATH = '/assets/bank-logos/bbva-logo-white.png';

let logoBytesPromise = null;

function loadBbvaLogoBytes() {
  if (!logoBytesPromise) {
    const url = `${window.location.origin}${LOGO_PATH}`;
    logoBytesPromise = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`BBVA logo fetch failed: ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buf) => new Uint8Array(buf));
  }
  return logoBytesPromise;
}

/** @param {import('pdf-lib').PDFDocument} doc */
export async function embedBbvaLogo(doc) {
  try {
    return await doc.embedPng(await loadBbvaLogoBytes());
  } catch (err) {
    console.warn('[embedBbvaLogo] logo fallback:', err);
    return null;
  }
}

/** @param {import('pdf-lib').PDFPage} pg */
export function drawBbvaPdfContinuationHeader(pg, logoEmbed, { fonts, layout, continuationTitle, today, securityPayload = null }) {
  const { r, b } = fonts;
  const { PH, PW, ML, MR } = layout;
  const barH = 18;
  const barBottom = PH - barH;
  const contentMidY = barBottom + barH / 2;
  const gap = 6;
  const logoH = 11;
  const barcodeW = 58;
  const barcodeH = 8;

  pg.drawRectangle({ x: 0, y: barBottom, width: PW, height: barH, color: BBVA_PDF_NAVY });

  let textX = ML;
  if (logoEmbed) {
    const scale = logoH / logoEmbed.height;
    const logoW = logoEmbed.width * scale;
    pg.drawImage(logoEmbed, {
      x: ML,
      y: contentMidY - logoH / 2,
      width: logoW,
      height: logoH,
    });
    textX = ML + logoW + gap;
  } else {
    pg.drawText('BBVA', { x: ML, y: contentMidY - 3, size: 8, font: b, color: BBVA_PDF_WHITE });
    textX = ML + 28 + gap;
  }

  pg.drawText(`\u2014  ${continuationTitle}`, { x: textX, y: contentMidY - 3, size: 6, font: b, color: BBVA_PDF_WHITE });

  if (securityPayload) {
    drawPdfHeaderSecurityMatrix(pg, securityPayload, { PW, MR, barBottom, barHeight: barH, width: barcodeW, height: barcodeH, pad: 1 });
  }
  const dateX = securityPayload ? PW - MR - barcodeW - 52 : PW - MR - 38;
  pg.drawText(today, { x: dateX, y: contentMidY - 3, size: 5.5, font: r, color: BBVA_PDF_WHITE_MUTED });
}

/** @param {import('pdf-lib').PDFPage} pg */
export async function drawBbvaPdfPage1Header(pg, doc, { fonts, layout, productLine1, contractNumber, today, logoEmbed = null, securityPayload = null }) {
  const { b, r } = fonts;
  const { PH, PW, ML, MR } = layout;
  const hH = 60;
  const accentH = 3;
  const headerBottom = PH - hH;
  const contentMidY = headerBottom + accentH + (hH - accentH) / 2;
  const barcodeW = 92;
  const barcodeH = 14;

  pg.drawRectangle({ x: 0, y: headerBottom, width: PW, height: hH, color: BBVA_PDF_NAVY });
  pg.drawRectangle({ x: 0, y: headerBottom, width: PW, height: accentH, color: BBVA_PDF_ACCENT });

  const line1Size = 9.5;
  const line2Size = 7;
  const lineLeading = 11;
  const line1Y = contentMidY + lineLeading / 2 + line2Size * 0.15;
  const line2Y = line1Y - lineLeading;

  const gap = 8;
  let dividerX = ML + 70;
  let textX = ML + 78;
  let logoH = 24;

  try {
    const logo = logoEmbed || await embedBbvaLogo(doc);
    if (!logo) throw new Error('BBVA logo unavailable');
    logoH = 24;
    const scale = logoH / logo.height;
    const logoW = logo.width * scale;
    pg.drawImage(logo, {
      x: ML,
      y: contentMidY - logoH / 2,
      width: logoW,
      height: logoH,
    });
    dividerX = ML + logoW + gap;
    textX = dividerX + gap;
  } catch (err) {
    console.warn('[drawBbvaPdfPage1Header] logo fallback:', err);
    pg.drawText('BBVA', { x: ML, y: contentMidY - 6, size: 22, font: b, color: BBVA_PDF_WHITE });
    dividerX = ML + 52 + gap;
    textX = dividerX + gap;
  }

  const groupHalfH = Math.max(logoH, lineLeading + line2Size) / 2 + 1;
  pg.drawLine({
    start: { x: dividerX, y: contentMidY - groupHalfH },
    end: { x: dividerX, y: contentMidY + groupHalfH },
    thickness: 0.5,
    color: BBVA_PDF_WHITE_DIM,
  });
  pg.drawText(productLine1, { x: textX, y: line1Y, size: line1Size, font: b, color: BBVA_PDF_WHITE });
  pg.drawText('mit garantierter Verzinsung', { x: textX, y: line2Y, size: line2Size, font: r, color: BBVA_PDF_WHITE_MUTED });

  if (securityPayload) {
    drawPdfHeaderSecurityMatrix(pg, securityPayload, { PW, MR, barBottom: headerBottom, barHeight: hH, width: barcodeW, height: barcodeH, pad: 2 });
  }

  const metaRight = securityPayload ? PW - MR - barcodeW - 14 : PW - MR;
  const metaX = metaRight - 152;
  pg.drawText(`Vertrag: ${contractNumber}`, { x: metaX, y: contentMidY + 1, size: 7, font: b, color: BBVA_PDF_WHITE });
  pg.drawText(`Datum: ${today}`, { x: metaX + 94, y: contentMidY + 1, size: 6.5, font: r, color: BBVA_PDF_WHITE_MUTED });

  return PH - hH - 12;
}
