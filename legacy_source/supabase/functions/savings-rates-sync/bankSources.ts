import type { ProductTypeDe, ResolvedRate } from './types.ts';
import {
  extractDkbNuxtRate,
  getJsonCachedRate,
  prefetchJsonAndCsvRates,
} from './bankJsonSources.ts';
import { extractRatesNearKeywords, parseDeRate, pickHeadlineRate } from './utils.ts';

export interface DirectBankSource {
  slug: string;
  url: string;
  productTypes: ProductTypeDe[];
  /** Prefer promo (highest) vs standard (derzeit / lower) rate */
  preferPromo?: boolean;
  extract?: (html: string) => number | null;
}

const FETCH_HEADERS = {
  'User-Agent': 'kapitalmitte/1.0 (savings-rate-sync; +https://kapitalmitte.eu)',
  'Accept-Language': 'de-DE,de;q=0.9,en;q=0.5',
  Accept: 'text/html,application/xhtml+xml',
};

/** Explicit fetch configs for banks not on Raisin (official product pages). */
export const DIRECT_BANK_SOURCES: DirectBankSource[] = [
  {
    slug: 'bigbank',
    url: 'https://www.bigbank.de/festgeld/',
    productTypes: ['Festgeld'],
    preferPromo: false,
    extract(html) {
      const fest12 = html.match(/12-23\s*Monate[^0-9]*(\d+[,.]\d+)\s*%/i);
      if (fest12) return parseDeRate(fest12[1]);
      return pickHeadlineRate(extractRatesNearKeywords(html), false);
    },
  },
  {
    slug: 'consorsbank',
    url: 'https://www.consorsbank.de/web/Sparen-Anlegen/Sparen/Festgeld',
    productTypes: ['Festgeld'],
    preferPromo: false,
    extract(html) {
      const fest12 = html.match(/12\s*Monate[^0-9]*(\d+[,.]\d+)\s*%\s*Zinsen/i);
      if (fest12) return parseDeRate(fest12[1]);
      return pickHeadlineRate(extractRatesNearKeywords(html), false);
    },
  },
  {
    slug: 'deutsche-kreditbank--dkb-',
    url: 'https://www.dkb.de/privatkunden/sparen/tagesgeld',
    productTypes: ['Tagesgeld', 'Festgeld'],
    preferPromo: true,
    extract(html) {
      const nuxt = extractDkbNuxtRate(html);
      if (nuxt != null) return nuxt;
      const promo = html.match(/(\d+[,.]\d+)\s*%\s*p\.?\s*a\.[^<]{0,80}Aktion/i);
      if (promo) return parseDeRate(promo[1]);
      return pickHeadlineRate(extractRatesNearKeywords(html), true);
    },
  },
  {
    slug: 'n26-bank',
    url: 'https://n26.com/de-de/savings',
    productTypes: ['Tagesgeld'],
    preferPromo: true,
    extract(html) {
      const rates = extractRatesNearKeywords(html);
      const savings = rates.filter((r) => r >= 1 && r <= 4);
      return pickHeadlineRate(savings.length ? savings : rates, true);
    },
  },
  {
    slug: 'comdirect-bank',
    url: 'https://www.comdirect.de/geldanlage/tagesgeld.html',
    productTypes: ['Tagesgeld', 'Festgeld'],
    preferPromo: true,
  },
  {
    slug: 'bbva-bank-deutschland',
    url: 'https://www.bbva.de/de/personas/productos/cuentas/cuenta-remunerada.html',
    productTypes: ['Tagesgeld', 'Festgeld'],
    preferPromo: true,
  },
  {
    slug: 'trade-republic',
    url: 'https://traderepublic.com/de-de',
    productTypes: ['Tagesgeld'],
    preferPromo: false,
  },
  {
    slug: 'openbank',
    url: 'https://www.openbank.de/tagesgeldkonto',
    productTypes: ['Tagesgeld'],
    preferPromo: true,
    extract(html) {
      const welcome = html.match(/(\d+[,.]\d+)\s*%\s*Willkommenszinsen/i);
      if (welcome) return parseDeRate(welcome[1]);
      return pickHeadlineRate(extractRatesNearKeywords(html), true);
    },
  },
  {
    slug: 'santander-deutschland',
    url: 'https://www.santander.de/privatkunden/sparen-und-anlegen/tagesgeld/',
    productTypes: ['Tagesgeld'],
    preferPromo: true,
  },
  {
    slug: '1822direkt',
    url: 'https://www.1822direkt.de/tagesgeld',
    productTypes: ['Tagesgeld'],
    preferPromo: true,
  },
  {
    slug: 'renault-bank-direkt',
    url: 'https://www.renault-bank-direkt.de/sparen/tagesgeld.html',
    productTypes: ['Tagesgeld'],
    preferPromo: true,
  },
  {
    slug: 'suresse-direkt-bank',
    url: 'https://www.suressedirektbank.de/de/sparen-anlegen/festgeld',
    productTypes: ['Festgeld'],
    preferPromo: false,
    extract(html) {
      const oneYear = html.match(/Für\s*1\s*Jahr[^0-9]*(\d+[,.]\d+)\s*%/i);
      if (oneYear) return parseDeRate(oneYear[1]);
      return pickHeadlineRate(extractRatesNearKeywords(html), false);
    },
  },
  {
    slug: 'ikano-bank',
    url: 'https://ikanobank.de/tagesgeld/fleks-horten-tagesgeld',
    productTypes: ['Tagesgeld'],
    preferPromo: true,
    extract(html) {
      const promo = html.match(/(\d+[,.]\d+)\s*%\s*[\s\S]{0,80}Guthabenzins/i);
      if (promo) return parseDeRate(promo[1]);
      const headline = html.match(/(\d+[,.]\d+)\s*%/);
      return headline ? parseDeRate(headline[1]) : null;
    },
  },
  {
    slug: 'tf-bank',
    url: 'https://tfbank.de/geldanlage/festgeld',
    productTypes: ['Festgeld'],
    preferPromo: false,
    extract(html) {
      const fest = html.match(/(\d+[,.]\d+)\s*%\s*p\.?\s*a\.[^<]{0,80}12\s*Monat/i);
      if (fest) return parseDeRate(fest[1]);
      return pickHeadlineRate(extractRatesNearKeywords(html), false);
    },
  },
  {
    slug: 'nibc-direct',
    url: 'https://www.nibc.de/privatkunden/sparen-anlegen/festgeld',
    productTypes: ['Festgeld'],
    preferPromo: false,
    extract(html) {
      return pickHeadlineRate(extractRatesNearKeywords(html), false);
    },
  },
  {
    slug: 'postfinance',
    url: 'https://www.postfinance.ch/de/privat/produkte/konten-karten/sparen.html',
    productTypes: ['Tagesgeld'],
    preferPromo: false,
  },
  {
    slug: 'easybank',
    url: 'https://www.easybank.de/easybank-de/lp/easybank-de-tagesgeldkonto/',
    productTypes: ['Tagesgeld'],
    preferPromo: true,
    extract(html) {
      const promo = html.match(/(\d+[,.]\d+)\s*%\s*p\.?\s*a\.[^<]{0,80}9\s*Monat/i);
      if (promo) return parseDeRate(promo[1]);
      return pickHeadlineRate(extractRatesNearKeywords(html), true);
    },
  },
  {
    slug: 'hello-bank',
    url: 'https://www.hellobank.fr/fr/particuliers/comptes/epargne/compte-epargne',
    productTypes: ['Tagesgeld'],
    preferPromo: true,
  },
  {
    slug: 'knab',
    url: 'https://www.knab.nl/particulier/rente-tarieven',
    productTypes: ['Festgeld'],
    preferPromo: false,
    extract(html) {
      const oneYear = html.match(/Rente bij 1 jaar vast[\s\S]{0,80}?(\d+[,.]\d+)%/i);
      if (oneYear) return parseDeRate(oneYear[1]);
      return pickHeadlineRate(extractRatesNearKeywords(html), false);
    },
  },
  {
    slug: 'mano-bankas',
    url: 'https://www.mano.bank/en/personal/deposits/',
    productTypes: ['Festgeld'],
    preferPromo: false,
    extract(html) {
      const twelve = html.match(/12\s*months[\s\S]{0,80}?(\d+[,.]\d+)\s*%/i);
      if (twelve) return parseDeRate(twelve[1]);
      return pickHeadlineRate(extractRatesNearKeywords(html), false);
    },
  },
  {
    slug: 'bunq-nederland',
    url: 'https://www.bunq.com/nl-nl/personal-account/savings',
    productTypes: ['Tagesgeld'],
    preferPromo: true,
  },
  {
    slug: 'bunq-deutschland',
    url: 'https://www.bunq.com/de-de/personal-account/savings',
    productTypes: ['Tagesgeld'],
    preferPromo: true,
  },
];

const directBySlug = new Map(DIRECT_BANK_SOURCES.map((s) => [s.slug, s]));

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    return html.length > 500 ? html : null;
  } catch {
    return null;
  }
}

export async function fetchDirectBankRate(
  bankSlug: string,
  productType: ProductTypeDe,
  websiteUrl?: string | null,
  jsonCache?: Map<string, ResolvedRate>,
): Promise<ResolvedRate | null> {
  const config = directBySlug.get(bankSlug);
  const url = config?.url ?? (websiteUrl?.startsWith('http') ? websiteUrl : null);

  if (config && !config.productTypes.includes(productType)) {
    return null;
  }

  if (url) {
    const html = await fetchHtml(url);
    if (html) {
      let rate: number | null = null;
      if (config?.extract) rate = config.extract(html);
      else rate = pickHeadlineRate(extractRatesNearKeywords(html), config?.preferPromo ?? true);

      if (rate != null) {
        return {
          rate,
          source: `bank website (${new URL(url).hostname})`,
          note: url,
        };
      }
    }
  }

  if (jsonCache) {
    const jsonRate = getJsonCachedRate(bankSlug, jsonCache);
    if (jsonRate) return jsonRate;
  }

  return null;
}

export async function prefetchDirectRates(): Promise<{
  html: Map<string, ResolvedRate>;
  json: Map<string, ResolvedRate>;
}> {
  const html = new Map<string, ResolvedRate>();
  const json = await prefetchJsonAndCsvRates();

  await Promise.all(
    DIRECT_BANK_SOURCES.map(async (src) => {
      const page = await fetchHtml(src.url);
      if (!page) return;
      let rate: number | null = null;
      if (src.extract) rate = src.extract(page);
      else rate = pickHeadlineRate(extractRatesNearKeywords(page), src.preferPromo ?? true);
      if (rate == null) return;
      html.set(src.slug, {
        rate,
        source: `bank website (${new URL(src.url).hostname})`,
        note: src.url,
      });
    }),
  );

  return { html, json };
}

export function getCachedDirectRate(
  bankSlug: string,
  productType: ProductTypeDe,
  caches: { html: Map<string, ResolvedRate>; json: Map<string, ResolvedRate> },
): ResolvedRate | null {
  const config = directBySlug.get(bankSlug);
  if (config && !config.productTypes.includes(productType)) return null;
  return caches.html.get(bankSlug) ?? getJsonCachedRate(bankSlug, caches.json);
}
