import { rgb } from 'pdf-lib';

const DEFAULT_DARK = rgb(26 / 255, 58 / 255, 107 / 255);
const FINDER_SIZE = 7;
const DATA_COLS = 38;
const MATRIX_ROWS = 7;
const MATRIX_COLS = FINDER_SIZE + DATA_COLS + FINDER_SIZE;

/** Interner Sicherheits-Matrixcode — kein Kundenlink, nicht scannbar. */
export function buildContractBarcodePayload({ contractNumber, product }) {
  const cnr = String(contractNumber || 'PENDING').trim();
  const prod = String(product || 'DOC').trim().toUpperCase();
  return `BR-${prod}-${cnr}`;
}

function hash32(str, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function isDataModuleOn(payload, dataCol, row) {
  const h = hash32(payload, dataCol * 997 + row * 1009);
  return (h & 0x7ff) > 1100;
}

const FINDER = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

function isLogicalCellOn(payload, col, row) {
  if (row >= MATRIX_ROWS || col >= MATRIX_COLS) return false;

  if (col < FINDER_SIZE && row < FINDER_SIZE) {
    return FINDER[row][col] === 1;
  }
  if (col >= MATRIX_COLS - FINDER_SIZE && row < FINDER_SIZE) {
    return FINDER[row][col - (MATRIX_COLS - FINDER_SIZE)] === 1;
  }
  if (col >= FINDER_SIZE && col < MATRIX_COLS - FINDER_SIZE) {
    return isDataModuleOn(payload, col - FINDER_SIZE, row);
  }
  return false;
}

function drawModule(pg, x, y, moduleSize, dark) {
  const inset = moduleSize * 0.08;
  pg.drawRectangle({
    x: x + inset,
    y: y + inset,
    width: Math.max(moduleSize - inset * 2, 0.2),
    height: Math.max(moduleSize - inset * 2, 0.2),
    color: dark,
  });
}

/** @param {import('pdf-lib').PDFPage} pg */
export function drawPdfHeaderSecurityMatrix(pg, payload, {
  PW,
  MR,
  barBottom,
  barHeight,
  width,
  height,
  pad = 1,
  dark = DEFAULT_DARK,
  light = rgb(1, 1, 1),
}) {
  if (!payload) return;

  const midY = barBottom + barHeight / 2;
  const x = PW - MR - width - 2;
  const y = midY - height / 2;

  pg.drawRectangle({
    x: x - pad,
    y: y - pad,
    width: width + pad * 2,
    height: height + pad * 2,
    color: light,
  });

  const innerX = x + 1;
  const innerY = y + 1;
  const innerW = width - 2;
  const innerH = height - 2;

  let moduleSize = innerH / MATRIX_ROWS;
  if (MATRIX_COLS * moduleSize > innerW) {
    moduleSize = innerW / MATRIX_COLS;
  }

  const gridW = MATRIX_COLS * moduleSize;
  const gridH = MATRIX_ROWS * moduleSize;
  const gridX = innerX + (innerW - gridW) / 2;
  const gridY = innerY + (innerH - gridH) / 2;

  for (let row = 0; row < MATRIX_ROWS; row += 1) {
    for (let col = 0; col < MATRIX_COLS; col += 1) {
      if (!isLogicalCellOn(payload, col, row)) continue;
      drawModule(
        pg,
        gridX + col * moduleSize,
        gridY + row * moduleSize,
        moduleSize,
        dark,
      );
    }
  }
}

/** @deprecated — Matrix wird direkt gezeichnet; Rückgabe ist nur das Payload. */
export async function embedPdfBarcode(_doc, payload) {
  return payload || null;
}

/** @deprecated Alias */
export function drawPdfHeaderBarcode(pg, payload, options) {
  drawPdfHeaderSecurityMatrix(pg, payload, options);
}
