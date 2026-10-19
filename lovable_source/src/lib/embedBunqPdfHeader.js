import { rgb } from 'pdf-lib';
import { drawPdfHeaderSecurityMatrix } from './embedPdfBarcode';
import { getBunqLogoPngBytes } from './bunqLogoPngBase64';

export const BUNQ_PDF_PUMPKIN = rgb(255 / 255, 120 / 255, 25 / 255);
export const BUNQ_PDF_TEAL = rgb(11 / 255, 79 / 255, 108 / 255);
export const BUNQ_PDF_TEAL_MUTED = rgb(0.25, 0.4, 0.48);
export const BUNQ_PDF_WHITE = rgb(1, 1, 1);
export const BUNQ_PDF_HEADER_BG = rgb(1, 1, 1);

/** @param {import('pdf-lib').PDFDocument} doc */
export async function embedBunqLogo(doc) {
  return doc.embedPng(getBunqLogoPngBytes());
}

function drawLogoBlock(pg, logoEmbed, { x, midY, height }) {
  const scale = height / logoEmbed.height;
  const width = logoEmbed.width * scale;
  pg.drawImage(logoEmbed, {
    x,
    y: midY - height / 2,
    width,
    height,
  });
  return width;
}

/** @param {import('pdf-lib').PDFPage} pg */
export function drawBunqPdfContinuationHeader(pg, logoEmbed, { fonts, layout, continuationTitle, today, securityPayload = null }) {
  const { r, b } = fonts;
  const { PH, PW, ML, MR } = layout;
  const barH = 18;
  const barBottom = PH - barH;
  const contentMidY = barBottom + barH / 2;
  const gap = 8;
  const logoH = 11;
  const barcodeW = 58;
  const barcodeH = 8;

  pg.drawRectangle({ x: 0, y: barBottom, width: PW, height: barH, color: BUNQ_PDF_HEADER_BG });
  pg.drawRectangle({ x: 0, y: PH - 2.5, width: PW, height: 2.5, color: BUNQ_PDF_PUMPKIN });
  pg.drawLine({
    start: { x: 0, y: barBottom },
    end: { x: PW, y: barBottom },
    thickness: 0.5,
    color: BUNQ_PDF_TEAL,
  });

  const logoW = drawLogoBlock(pg, logoEmbed, { x: ML, midY: contentMidY, height: logoH });
  const textX = ML + logoW + gap;
  pg.drawText(`\u2014  ${continuationTitle}`, { x: textX, y: contentMidY - 3, size: 6, font: b, color: BUNQ_PDF_TEAL });

  if (securityPayload) {
    drawPdfHeaderSecurityMatrix(pg, securityPayload, { PW, MR, barBottom, barHeight: barH, width: barcodeW, height: barcodeH, pad: 1 });
  }
  const dateX = securityPayload ? PW - MR - barcodeW - 52 : PW - MR - 38;
  pg.drawText(today, { x: dateX, y: contentMidY - 3, size: 5.5, font: r, color: BUNQ_PDF_TEAL_MUTED });
}

/** @param {import('pdf-lib').PDFPage} pg */
export async function drawBunqPdfPage1Header(pg, doc, { fonts, layout, productLine1, contractNumber, today, logoEmbed = null, securityPayload = null }) {
  const { b, r } = fonts;
  const { PH, PW, ML, MR } = layout;
  const hH = 60;
  const accentH = 4;
  const headerBottom = PH - hH;
  const contentMidY = headerBottom + (hH - accentH) / 2;
  const barcodeW = 92;
  const barcodeH = 14;

  pg.drawRectangle({ x: 0, y: headerBottom, width: PW, height: hH, color: BUNQ_PDF_HEADER_BG });
  pg.drawRectangle({ x: 0, y: PH - accentH, width: PW, height: accentH, color: BUNQ_PDF_PUMPKIN });
  pg.drawRectangle({ x: 0, y: headerBottom, width: PW, height: 1.5, color: BUNQ_PDF_TEAL });

  const line1Size = 9.5;
  const line2Size = 7;
  const lineLeading = 11;
  const line1Y = contentMidY + lineLeading / 2 + line2Size * 0.15;
  const line2Y = line1Y - lineLeading;

  const logoGap = 12;
  const textGap = 10;
  const logoH = 22;

  const logo = logoEmbed || (await embedBunqLogo(doc));
  const logoW = drawLogoBlock(pg, logo, { x: ML, midY: contentMidY, height: logoH });
  const dividerX = ML + logoW + logoGap;
  const textX = dividerX + textGap;

  const groupHalfH = Math.max(logoH, lineLeading + line2Size) / 2 + 1;
  pg.drawLine({
    start: { x: dividerX, y: contentMidY - groupHalfH },
    end: { x: dividerX, y: contentMidY + groupHalfH },
    thickness: 0.5,
    color: BUNQ_PDF_PUMPKIN,
  });
  pg.drawText(productLine1, { x: textX, y: line1Y, size: line1Size, font: b, color: BUNQ_PDF_TEAL });
  pg.drawText('mit garantierter Verzinsung', { x: textX, y: line2Y, size: line2Size, font: r, color: BUNQ_PDF_TEAL_MUTED });

  if (securityPayload) {
    drawPdfHeaderSecurityMatrix(pg, securityPayload, { PW, MR, barBottom: headerBottom, barHeight: hH, width: barcodeW, height: barcodeH, pad: 2 });
  }

  const metaRight = securityPayload ? PW - MR - barcodeW - 14 : PW - MR;
  const metaX = metaRight - 152;
  pg.drawText(`Vertrag: ${contractNumber}`, { x: metaX, y: contentMidY + 1, size: 7, font: b, color: BUNQ_PDF_TEAL });
  pg.drawText(`Datum: ${today}`, { x: metaX + 94, y: contentMidY + 1, size: 6.5, font: r, color: BUNQ_PDF_TEAL_MUTED });

  return PH - hH - 12;
}
