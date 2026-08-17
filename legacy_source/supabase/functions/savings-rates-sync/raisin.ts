import type { RaisinOffer } from './types.ts';

const RAISIN_API =
  'https://api2.weltsparen.de/dcms/v1/public/products?distribution_channel_id=raisin_direct_retail_deu&distributor_id=Raisin&limit=500';

/** Our bank slug -> Raisin partner bank_slug */
export const RAISIN_SLUG_MAP: Record<string, string> = {
  'mano-bankas': 'ab-mano-bankas',
  inbank: 'inbank',
  'nordax-bank': 'nordax-bank-ab-publ',
  'klarna-bank': 'klarna-bank-ab',
  'collector-bank': 'collector',
  'morrow-bank': 'morrow-bank',
  'citadele-banka': 'cbl-bank',
  'artea-ab': 'artea-ab',
  'bluor-bank-as': 'blu-or-bank-as',
  'coop-pank': 'coop-pank',
  'resurs-bank': 'resurs-bank',
  'bff-bank': 'bff',
  'illimity-bank': 'illimity',
  'banca-progetto': 'banca-progetto',
  'medirect-bank': 'me-direct-bank-malta-plc',
  instabank: 'instabank-asa',
  'lea-bank': 'lea-bank-ab',
  'lhv-pank': 'lhv-pank',
  vivibanca: 'vi-vi-banca',
  'distingo-bank': 'distingo-bank',
  unicredit: 'uni-credit-nv-sa',
  imprebanca: 'imprebanca',
  'civi-bank': 'civi-bank',
};

const PRODUCT_TYPE_DE = {
  OVERNIGHT: 'Tagesgeld',
  NOTICE: 'Flexgeld',
  TERM: 'Festgeld',
} as const;

export async function fetchRaisinOffersByBank(): Promise<Map<string, RaisinOffer[]>> {
  const res = await fetch(RAISIN_API, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'kapitalmitte/1.0 (savings-rate-sync; +https://kapitalmitte.eu)',
    },
  });
  if (!res.ok) throw new Error(`Raisin API ${res.status}`);

  const data = await res.json();
  const byBank = new Map<string, RaisinOffer[]>();

  for (const entry of data.entries ?? []) {
    const bank = entry.deposit_taking_bank;
    if (!bank?.bank_slug) continue;
    const rate = parseFloat(entry.interest_rates?.interest_rate_nominal);
    if (!Number.isFinite(rate)) continue;

    const offer: RaisinOffer = {
      productType: entry.product_type,
      productTypeDe: PRODUCT_TYPE_DE[entry.product_type as keyof typeof PRODUCT_TYPE_DE] ?? 'Festgeld',
      rate,
      termMonths:
        entry.term?.unit === 'months' && entry.term?.period != null
          ? Number(entry.term.period)
          : entry.product_type === 'OVERNIGHT' || entry.product_type === 'NOTICE'
            ? 0
            : null,
      productName: entry.display?.product_name,
      effectiveDate: entry.interest_rates?.effective_date,
    };

    const slug = bank.bank_slug;
    if (!byBank.has(slug)) byBank.set(slug, []);
    byBank.get(slug)!.push(offer);
  }

  return byBank;
}

export function getRaisinOffersForSlug(
  bankSlug: string,
  byBank: Map<string, RaisinOffer[]>,
): RaisinOffer[] | null {
  const raisinSlug = RAISIN_SLUG_MAP[bankSlug] ?? bankSlug;
  return byBank.get(raisinSlug) ?? null;
}
