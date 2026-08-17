import { rgb } from 'pdf-lib';
import { drawPdfHeaderSecurityMatrix } from './embedPdfBarcode';
import { getKnabLogoPngBytes } from './knabLogoPngBase64';

export const KNAB_PDF_PRIMARY = rgb(62 / 255, 74 / 255, 89 / 255);
export const KNAB_PDF_ACCENT = rgb(232 / 255, 160 / 255, 32 / 255);
export const KNAB_PDF_WHITE = rgb(1, 1, 1);
export const KNAB_PDF_WHITE_MUTED = rgb(0.78, 0.85, 0.92);
export const KNAB_PDF_WHITE_DIM = rgb(0.55, 0.65, 0.78);

/** @param {import('pdf-lib').PDFDocument} doc */
export async function embedKnabLogo(doc) {
  try {
    return await doc.embedPng(getKnabLogoPngBytes());
  } catch (err) {
    console.warn('[embedKnabLogo] failed:', err);
    return null;
  }
}

function drawKnabLogoOnHeader(pg, logoEmbed, { x, contentMidY, logoH }) {
  const scale = logoH / logoEmbed.height;
  const logoW = logoEmbed.width * scale;
  const padX = 5;
  const padY = 3;
  const boxW = logoW + padX * 2 + 4;
  const boxH = logoH + padY * 2;
  pg.drawRectangle({
    x: x - 2,
    y: contentMidY - boxH / 2,
    width: boxW,
    height: boxH,
    color: KNAB_PDF_WHITE,
  });
  pg.drawImage(logoEmbed, {
    x: x + padX,
    y: contentMidY - logoH / 2,
    width: logoW,
    height: logoH,
  });
  return boxW;
}

/** @param {import('pdf-lib').PDFPage} pg */
export function drawKnabPdfContinuationHeader(pg, logoEmbed, { fonts, layout, continuationTitle, today, securityPayload = null }) {
  const { r, b } = fonts;
  const { PH, PW, ML, MR } = layout;
  const barH = 18;
  const barBottom = PH - barH;
  const contentMidY = barBottom + barH / 2;
  const gap = 8;
  const logoH = 10;
  const barcodeW = 58;
  const barcodeH = 8;

  pg.drawRectangle({ x: 0, y: barBottom, width: PW, height: barH, color: KNAB_PDF_PRIMARY });

  let textX = ML;
  if (logoEmbed) {
    const logoBlockW = drawKnabLogoOnHeader(pg, logoEmbed, { x: ML, contentMidY, logoH });
    textX = ML + logoBlockW + gap;
  }

  pg.drawText(`\u2014  ${continuationTitle}`, { x: textX, y: contentMidY - 3, size: 6, font: b, color: KNAB_PDF_WHITE });

  if (securityPayload) {
    drawPdfHeaderSecurityMatrix(pg, securityPayload, { PW, MR, barBottom, barHeight: barH, width: barcodeW, height: barcodeH, pad: 1 });
  }
  const dateW = r.widthOfTextAtSize(today, 5.5);
  const dateX = securityPayload ? PW - MR - barcodeW - dateW - 8 : PW - MR - dateW;
  pg.drawText(today, { x: dateX, y: contentMidY - 3, size: 5.5, font: r, color: KNAB_PDF_WHITE_MUTED });
}

/** @param {import('pdf-lib').PDFPage} pg */
export async function drawKnabPdfPage1Header(pg, doc, { fonts, layout, productLine1, contractNumber, today, logoEmbed = null, securityPayload = null }) {
  const { b, r } = fonts;
  const { PH, PW, ML, MR } = layout;
  const hH = 60;
  const accentH = 3;
  const headerBottom = PH - hH;
  const contentMidY = headerBottom + accentH + (hH - accentH) / 2;
  const barcodeW = 92;
  const barcodeH = 14;

  pg.drawRectangle({ x: 0, y: headerBottom, width: PW, height: hH, color: KNAB_PDF_PRIMARY });
  pg.drawRectangle({ x: 0, y: headerBottom, width: PW, height: accentH, color: KNAB_PDF_ACCENT });

  const line1Size = 9.5;
  const line2Size = 7;
  const lineLeading = 11;
  const line1Y = contentMidY + lineLeading / 2 + line2Size * 0.15;
  const line2Y = line1Y - lineLeading;

  const gap = 10;
  const logoH = 22;
  const logo = logoEmbed || await embedKnabLogo(doc);
  let logoBlockW = 0;
  if (logo) {
    logoBlockW = drawKnabLogoOnHeader(pg, logo, { x: ML, contentMidY, logoH });
  }

  const dividerX = ML + logoBlockW + gap;
  const textX = dividerX + gap;

  const groupHalfH = Math.max(logoH + 6, lineLeading + line2Size) / 2 + 1;
  pg.drawLine({
    start: { x: dividerX, y: contentMidY - groupHalfH },
    end: { x: dividerX, y: contentMidY + groupHalfH },
    thickness: 0.5,
    color: KNAB_PDF_WHITE_DIM,
  });
  pg.drawText(productLine1, { x: textX, y: line1Y, size: line1Size, font: b, color: KNAB_PDF_WHITE });
  pg.drawText('mit garantierter Verzinsung', { x: textX, y: line2Y, size: line2Size, font: r, color: KNAB_PDF_WHITE_MUTED });

  if (securityPayload) {
    drawPdfHeaderSecurityMatrix(pg, securityPayload, { PW, MR, barBottom: headerBottom, barHeight: hH, width: barcodeW, height: barcodeH, pad: 2 });
  }

  const metaRight = securityPayload ? PW - MR - barcodeW - 14 : PW - MR;
  const contractLabel = `Vertrag: ${contractNumber}`;
  const dateLabel = `Datum: ${today}`;
  const contractW = b.widthOfTextAtSize(contractLabel, 7);
  const dateW = r.widthOfTextAtSize(dateLabel, 6.5);
  const metaW = Math.max(contractW, dateW);
  const metaX = metaRight - metaW;
  pg.drawText(contractLabel, { x: metaX, y: contentMidY + 7, size: 7, font: b, color: KNAB_PDF_WHITE });
  pg.drawText(dateLabel, { x: metaX, y: contentMidY - 5, size: 6.5, font: r, color: KNAB_PDF_WHITE_MUTED });

  return PH - hH - 12;
}
