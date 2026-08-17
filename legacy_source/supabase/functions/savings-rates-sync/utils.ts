import type { ProductTypeDe, RaisinOffer, RaisinProductType } from './types.ts';

export function parseDeRate(raw: string): number | null {
  const n = parseFloat(String(raw).replace(',', '.').trim());
  return Number.isFinite(n) && n >= 0 && n <= 15 ? n : null;
}

export function normalizeProductType(value: string | null | undefined): ProductTypeDe {
  const v = String(value || '').trim();
  if (v === 'Tagesgeld' || v === 'Flexgeld' || v === 'Festgeld') return v;
  return 'Festgeld';
}

const PRODUCT_TO_RAISIN: Record<ProductTypeDe, RaisinProductType[]> = {
  Tagesgeld: ['OVERNIGHT', 'NOTICE', 'TERM'],
  Flexgeld: ['NOTICE', 'OVERNIGHT', 'TERM'],
  Festgeld: ['TERM', 'NOTICE', 'OVERNIGHT'],
};

export function pickRaisinRate(
  offers: RaisinOffer[],
  productType: ProductTypeDe,
  depositTerm: number,
): RaisinOffer | null {
  if (!offers.length) return null;

  const order = PRODUCT_TO_RAISIN[productType];
  for (const raisinType of order) {
    const pool = offers.filter((o) => o.productType === raisinType);
    if (!pool.length) continue;

    if (raisinType === 'TERM' && depositTerm > 0) {
      const exact = pool.find((o) => o.termMonths === depositTerm);
      if (exact) return exact;
      const closest = [...pool].sort(
        (a, b) =>
          Math.abs((a.termMonths ?? 0) - depositTerm) -
          Math.abs((b.termMonths ?? 0) - depositTerm),
      )[0];
      if (closest) return closest;
    }

    return [...pool].sort((a, b) => b.rate - a.rate)[0];
  }

  return [...offers].sort((a, b) => b.rate - a.rate)[0];
}

/** Extract plausible interest rates near savings keywords in HTML. */
export function extractRatesNearKeywords(html: string): number[] {
  const keywords = [
    'Zinssatz',
    'Zinsen p.a',
    'Zinsen p. a',
    'Tagesgeld',
    'Festgeld',
    'Flexgeld',
    'variabel',
    'Neukunden',
    'Bonuszinssatz',
    'derzeit',
  ];
  const rates: number[] = [];

  for (const kw of keywords) {
    let idx = 0;
    while ((idx = html.indexOf(kw, idx)) >= 0) {
      const window = html.slice(Math.max(0, idx - 40), idx + 160);
      for (const m of window.matchAll(/(\d+[,.]\d+)\s*%/g)) {
        const rate = parseDeRate(m[1]);
        if (rate != null && rate >= 0.4 && rate <= 6.5) rates.push(rate);
      }
      idx += kw.length;
    }
  }

  return rates;
}

export function pickHeadlineRate(rates: number[], preferPromo = true): number | null {
  if (!rates.length) return null;
  const uniq = [...new Set(rates)].sort((a, b) => b - a);
  if (preferPromo) return uniq[0];
  return uniq.find((r) => r <= 2.5) ?? uniq[uniq.length - 1];
}
