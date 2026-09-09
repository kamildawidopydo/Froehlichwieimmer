import { isExcludedSavingsBankSlug } from '@/lib/comparisonCatalog';
import {
  COMPARISON_MIN_DEPOSIT_EUR,
  formatComparisonMinDepositWithCurrency,
} from '@/lib/comparisonDisplay';
import { formatRateDe } from '@/lib/interestRateHistory';

const PRODUCT_TYPES = ['Festgeld', 'Flexgeld', 'Tagesgeld'];

function normalizeInvestmentType(offer) {
  const raw = offer?.investment_type?.trim();
  if (raw) return raw;
  return offer?.deposit_term === 0 ? 'Tagesgeld' : 'Festgeld';
}

function offersForType(offers, type) {
  const target = type.toLowerCase();
  return offers.filter((o) => normalizeInvestmentType(o).toLowerCase() === target);
}

/** @param {Array<{ interest_rate?: number, investment_type?: string, deposit_term?: number }>} offers */
export function maxRateForType(offers, type) {
  const filtered = offersForType(offers, type);
  if (!filtered.length) return null;
  return Math.max(...filtered.map((o) => Number(o.interest_rate) || 0));
}

/** Mindestanlage wie auf /comparison (einheitlich für alle Partnerbanken). */
export function minDepositForType(offers, type) {
  const filtered = offersForType(offers, type);
  if (!filtered.length) return null;
  return COMPARISON_MIN_DEPOSIT_EUR;
}

/**
 * @returns {Promise<Record<string, { maxRate: number | null, minDeposit: number | null }>>}
 */
export function buildStatsByProductType(offers) {
  /** @type {Record<string, { maxRate: number | null, minDeposit: number | null }>} */
  const stats = {};
  for (const type of PRODUCT_TYPES) {
    stats[type] = {
      maxRate: maxRateForType(offers, type),
      minDeposit: minDepositForType(offers, type),
    };
  }
  return stats;
}

export async function fetchActiveComparisonOffers() {
  const { data, error } = { data: [], error: null }; // 82.92 DATA_SOURCE_MISSING (savings_offers stats)

  if (error) throw error;
  return (data || []).filter((o) => !isExcludedSavingsBankSlug(o.banks?.slug));
}

export async function fetchSavingsOfferStatsByType() {
  const offers = await fetchActiveComparisonOffers();
  return buildStatsByProductType(offers);
}

export function formatMinDepositDe(minDeposit) {
  if (minDeposit == null) return null;
  return formatComparisonMinDepositWithCurrency();
}

/** CTA copy aligned with /comparison offer data. */
export function formatGuideMarketTeaser({ maxRate, minDeposit, loading }) {
  if (loading) {
    return {
      ratePart: null,
      depositPart: 'Konditionen werden aus dem aktuellen Vergleich geladen …',
    };
  }

  if (maxRate == null || maxRate <= 0) {
    return {
      ratePart: null,
      depositPart:
        'Aktuelle Zinssätze und Mindestanlagen finden Sie im Live-Vergleich regulierter EU-Partnerbanken.',
    };
  }

  const ratePart = `Bis zu ${formatRateDe(maxRate)} % p.a.`;
  const depLabel = formatMinDepositDe(minDeposit);
  let depositPart = 'bei regulierten EU-Partnerbanken';
  if (depLabel) {
    depositPart += ` — Mindestanlage im Vergleich ${depLabel}`;
  }
  depositPart += '.';

  return { ratePart, depositPart };
}

export { PRODUCT_TYPES as SAVINGS_PRODUCT_TYPES };
