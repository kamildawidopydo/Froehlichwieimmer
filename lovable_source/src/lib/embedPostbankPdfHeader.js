import { rgb } from 'pdf-lib';
import { drawPdfHeaderSecurityMatrix } from './embedPdfBarcode';
import { getPostbankLogoPngBytes } from './postbankLogoPngBase64';

export const POSTBANK_PDF_YELLOW = rgb(255 / 255, 204 / 255, 0 / 255);
export const POSTBANK_PDF_YELLOW_DARK = rgb(230 / 255, 184 / 255, 0 / 255);
export const POSTBANK_PDF_NAVY = rgb(0 / 255, 51 / 255, 102 / 255);
export const POSTBANK_PDF_NAVY_MUTED = rgb(0.35, 0.45, 0.55);

/** @param {import('pdf-lib').PDFDocument} doc */
export async function embedPostbankLogo(doc) {
  return doc.embedPng(getPostbankLogoPngBytes());
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
export function drawPostbankPdfContinuationHeader(pg, logoEmbed, { fonts, layout, continuationTitle, today, securityPayload = null }) {
  const { r, b } = fonts;
  const { PH, PW, ML, MR } = layout;
  const barH = 18;
  const barBottom = PH - barH;
  const contentMidY = barBottom + barH / 2;
  const gap = 8;
  const logoH = 12;
  const barcodeW = 58;
  const barcodeH = 8;

  pg.drawRectangle({ x: 0, y: barBottom, width: PW, height: barH, color: POSTBANK_PDF_YELLOW });
  pg.drawRectangle({ x: 0, y: barBottom, width: PW, height: 2, color: POSTBANK_PDF_YELLOW_DARK });

  const logoW = drawLogoBlock(pg, logoEmbed, { x: ML, midY: contentMidY, height: logoH });
  const textX = ML + logoW + gap;
  pg.drawText(`\u2014  ${continuationTitle}`, { x: textX, y: contentMidY - 3, size: 6, font: b, color: POSTBANK_PDF_NAVY });

  if (securityPayload) {
    drawPdfHeaderSecurityMatrix(pg, securityPayload, { PW, MR, barBottom, barHeight: barH, width: barcodeW, height: barcodeH, pad: 1 });
  }
  const dateX = securityPayload ? PW - MR - barcodeW - 52 : PW - MR - 38;
  pg.drawText(today, { x: dateX, y: contentMidY - 3, size: 5.5, font: r, color: POSTBANK_PDF_NAVY_MUTED });
}

/** @param {import('pdf-lib').PDFPage} pg */
export async function drawPostbankPdfPage1Header(pg, doc, { fonts, layout, productLine1, contractNumber, today, logoEmbed = null, securityPayload = null }) {
  const { b, r } = fonts;
  const { PH, PW, ML, MR } = layout;
  const hH = 60;
  const accentH = 3;
  const headerBottom = PH - hH;
  const contentMidY = headerBottom + accentH + (hH - accentH) / 2;
  const barcodeW = 92;
  const barcodeH = 14;

  pg.drawRectangle({ x: 0, y: headerBottom, width: PW, height: hH, color: POSTBANK_PDF_YELLOW });
  pg.drawRectangle({ x: 0, y: headerBottom, width: PW, height: accentH, color: POSTBANK_PDF_YELLOW_DARK });

  const line1Size = 9.5;
  const line2Size = 7;
  const lineLeading = 11;
  const line1Y = contentMidY + lineLeading / 2 + line2Size * 0.15;
  const line2Y = line1Y - lineLeading;

  const logoGap = 12;
  const textGap = 10;
  const logoH = 28;

  const logo = logoEmbed || await embedPostbankLogo(doc);
  const logoW = drawLogoBlock(pg, logo, { x: ML, midY: contentMidY, height: logoH });
  const dividerX = ML + logoW + logoGap;
  const textX = dividerX + textGap;

  const groupHalfH = Math.max(logoH, lineLeading + line2Size) / 2 + 1;
  pg.drawLine({
    start: { x: dividerX, y: contentMidY - groupHalfH },
    end: { x: dividerX, y: contentMidY + groupHalfH },
    thickness: 0.5,
    color: POSTBANK_PDF_NAVY_MUTED,
  });
  pg.drawText(productLine1, { x: textX, y: line1Y, size: line1Size, font: b, color: POSTBANK_PDF_NAVY });
  pg.drawText('mit garantierter Verzinsung', { x: textX, y: line2Y, size: line2Size, font: r, color: POSTBANK_PDF_NAVY_MUTED });

  if (securityPayload) {
    drawPdfHeaderSecurityMatrix(pg, securityPayload, { PW, MR, barBottom: headerBottom, barHeight: hH, width: barcodeW, height: barcodeH, pad: 2 });
  }

  const metaRight = securityPayload ? PW - MR - barcodeW - 14 : PW - MR;
  const metaX = metaRight - 152;
  pg.drawText(`Vertrag: ${contractNumber}`, { x: metaX, y: contentMidY + 1, size: 7, font: b, color: POSTBANK_PDF_NAVY });
  pg.drawText(`Datum: ${today}`, { x: metaX + 94, y: contentMidY + 1, size: 6.5, font: r, color: POSTBANK_PDF_NAVY_MUTED });

  return PH - hH - 12;
}
