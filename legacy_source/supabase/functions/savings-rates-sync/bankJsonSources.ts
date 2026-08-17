import type { ResolvedRate } from './types.ts';
import { parseDeRate } from './utils.ts';

/** DKB publishes competitor standard rates as CSV (Contentful CDN). */
const DKB_TAGESGELD_CSV_URL =
  'https://assets.eu.ctfassets.net/itz38ewm719j/bpItgiE7FPbKorbbQSaQA/8065696c379440a75f6dc74923840789/Tagesgeldzinsen.csv';

/** CSV label -> our bank slug (standard Tagesgeld rates from DKB comparison chart). */
const DKB_CSV_SLUG_MAP: Record<string, string> = {
  DKB: 'deutsche-kreditbank--dkb-',
  Consorsbank: 'consorsbank',
  Comdirect: 'comdirect-bank',
  Santander: 'santander-deutschland',
};

const FETCH_HEADERS = {
  'User-Agent': 'kapitalmitte/1.0 (savings-rate-sync; +https://kapitalmitte.eu)',
  Accept: 'text/csv,text/plain,*/*',
};

function parseCsvRateCell(cell: string): number | null {
  const cleaned = cell.replace(/&nbsp;/g, ' ').replace(/"/g, '').trim();
  const m = cleaned.match(/(\d+[,.]\d+)/);
  return m ? parseDeRate(m[1]) : null;
}

export async function fetchDkbComparisonCsvRates(): Promise<Map<string, ResolvedRate>> {
  const out = new Map<string, ResolvedRate>();
  try {
    const res = await fetch(DKB_TAGESGELD_CSV_URL, { headers: FETCH_HEADERS });
    if (!res.ok) return out;
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    for (const line of lines.slice(1)) {
      const parts = line.split(';');
      if (parts.length < 2) continue;
      const label = parts[0].trim();
      const slug = DKB_CSV_SLUG_MAP[label];
      if (!slug) continue;
      const rate = parseCsvRateCell(parts[1]);
      if (rate == null) continue;
      out.set(slug, {
        rate,
        source: 'dkb.de comparison CSV (Contentful)',
        note: DKB_TAGESGELD_CSV_URL,
      });
    }
  } catch {
    // best-effort
  }
  return out;
}

/** Extract headline rate from DKB Nuxt SSR payload (__NUXT_DATA__). */
export function extractDkbNuxtRate(html: string): number | null {
  const nuxtMatch = html.match(/id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nuxtMatch) {
    try {
      const payload = JSON.parse(nuxtMatch[1]);
      if (Array.isArray(payload)) {
        for (const item of payload) {
          if (typeof item !== 'string') continue;
          const exact = item.match(/^(\d+)\s*%\s*Zinsen p\.?\s*a\.?\s*$/i);
          if (exact) return parseFloat(exact[1]);
          const variabel = item.match(/^(\d+)\s*%\s*Zinsen p\.?\s*a\.?\s*variabel/i);
          if (variabel) return parseFloat(variabel[1]);
        }
      }
    } catch {
      // ignore malformed payload
    }
  }

  const promo = html.match(/(\d+[,.]\d+)\s*%\s*p\.?\s*a\.[^<]{0,120}(?:Aktion|Neugeld|neu eingezahlt)/i);
  if (promo) return parseDeRate(promo[1]);

  const variabel = html.match(/(\d+[,.]\d+)\s*%\s*Zinsen p\.?\s*a\.?\s*variabel/i);
  if (variabel) return parseDeRate(variabel[1]);

  return null;
}

export async function fetchConsorsbankStandardRate(): Promise<ResolvedRate | null> {
  const url = 'https://www.consorsbank.de/web/Service/Preise-Zinsen/Preise-Zinsen-Konten';
  try {
    const res = await fetch(url, {
      headers: {
        ...FETCH_HEADERS,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'de-DE,de;q=0.9',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const tagesBlock = html.match(/Tagesgeldkonto[\s\S]{0,800}?(\d+[,.]\d+)\s*%\s*p\.?\s*a\.?/i);
    if (tagesBlock) {
      const rate = parseDeRate(tagesBlock[1]);
      if (rate != null) {
        return { rate, source: 'consorsbank.de Preise & Zinsen', note: url };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function prefetchJsonAndCsvRates(): Promise<Map<string, ResolvedRate>> {
  const cache = new Map<string, ResolvedRate>();

  const [csvRates, consorsStandard] = await Promise.all([
    fetchDkbComparisonCsvRates(),
    fetchConsorsbankStandardRate(),
  ]);

  for (const [slug, rate] of csvRates) {
    cache.set(slug, rate);
  }

  if (consorsStandard && !cache.has('consorsbank')) {
    cache.set('consorsbank', consorsStandard);
  }

  return cache;
}

export function getJsonCachedRate(
  bankSlug: string,
  cache: Map<string, ResolvedRate>,
): ResolvedRate | null {
  return cache.get(bankSlug) ?? null;
}
