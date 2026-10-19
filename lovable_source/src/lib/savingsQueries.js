/** Datenquellen-unabhängiger Kern von /api/public/savings-offers (Port von public_reads.py). */
import { computeYield } from '@/lib/savingsCalculator';

export function createSavingsQueries(banksRaw, offersRaw, countriesRaw) {
const PRODUCT_TYPE_LABELS = { tagesgeld: 'Tagesgeld', festgeld: 'Festgeld', flexgeld: 'Flexgeld' };

const banksBySlug = new Map(banksRaw.map((b) => [b.slug, b]));
const banksById = new Map(banksRaw.map((b) => [String(b.id), b]));

const COUNTRIES = countriesRaw
  .filter((c) => c.is_active !== false)
  .sort((a, b) => String(a.name_de).localeCompare(String(b.name_de), 'de'));

const countryByCode = new Map(COUNTRIES.map((c) => [c.code, c]));

function serializeBank(bank) {
  if (!bank) return null;
  return {
    id: String(bank.id),
    slug: bank.slug,
    name: bank.name,
    legal_name: bank.legal_name ?? null,
    country: bank.country ?? null,
    country_code: bank.country_code ?? null,
    logo_url: bank.logo_url ?? null,
    website_url: bank.website_url ?? null,
    description: bank.description ?? null,
    founded_year: bank.founded_year ?? null,
    credit_rating: bank.credit_rating ?? null,
    regulator_name: bank.regulator_name ?? null,
    deposit_protection: bank.deposit_protection ?? null,
    deposit_protection_amount: bank.deposit_protection_amount ?? null,
    deposit_guarantee_country_code: bank.deposit_guarantee_country_code ?? null,
    dgs_code: bank.dgs_code ?? null,
    interest_frequency_default: bank.interest_frequency_default ?? null,
    is_demo: Boolean(bank.is_demo),
  };
}

/** Phase 6A.1 — strikte Verified-Semantik. */
function isFullyVerified(o) {
  if (o.is_demo) return false;
  if (o.is_active === false) return false;
  return Boolean(o.source_url && (o.source_timestamp || o.verified_at) && o.source_name);
}

function dataStatus(o) {
  if (o.is_demo) return 'demo';
  return isFullyVerified(o) ? 'verified' : 'unverified';
}

function serializeOffer(o, bank, amount) {
  const productType = o.product_type || o.investment_type;
  const pt = String(productType || '').toLowerCase();
  const investmentType = PRODUCT_TYPE_LABELS[pt] ?? o.investment_type ?? null;
  let depositTerm = o.deposit_term;
  if (depositTerm === undefined || depositTerm === null) {
    depositTerm = pt === 'tagesgeld' ? 0 : (o.term_months ?? null);
  }
  const countryIso =
    typeof o.country === 'string' && o.country.length === 2 ? o.country : bank?.country_code ?? null;
  const countryDisplay = bank?.country ?? o.country ?? null;
  const cond = o.conditions && typeof o.conditions === 'object' ? o.conditions : {};

  const item = {
    id: String(o.id),
    bank_id: o.bank_id != null ? String(o.bank_id) : bank ? String(bank.id) : null,
    bank_slug: o.bank_slug ?? null,
    product_key: o.product_key ?? null,
    interest_rate: o.interest_rate ?? null,
    interest_rate_type: o.interest_rate_type ?? null,
    promo_rate: o.promo_rate ?? null,
    promo_duration_months: o.promo_duration_months ?? null,
    standard_rate_after_promo: o.standard_rate_after_promo ?? null,
    deposit_term: depositTerm,
    term_months: o.term_months ?? null,
    investment_type: investmentType,
    product_type: productType ?? null,
    product_name: o.product_name ?? null,
    min_deposit: o.min_deposit ?? o.min_amount ?? null,
    max_deposit: o.max_deposit ?? o.max_amount ?? null,
    min_amount: o.min_amount ?? null,
    max_amount: o.max_amount ?? null,
    currency: o.currency || 'EUR',
    country: countryDisplay,
    country_code: countryIso,
    new_customers_only: Boolean(o.new_customers_only),
    existing_customers_offer: o.existing_customers_offer !== false,
    welcome_bonus: o.welcome_bonus ?? null,
    notes: o.notes ?? null,
    conditions: o.conditions ?? null,
    affiliate_url: o.affiliate_url ?? null,
    online_account_opening: o.online_account_opening !== false,
    available_for_de_customers: o.available_for_de_customers !== false,
    interest_frequency: o.interest_frequency ?? o.interest_credit_frequency ?? null,
    deposit_protection:
      o.deposit_protection ?? o.deposit_guarantee_country ?? bank?.deposit_protection ?? null,
    deposit_protection_amount:
      o.deposit_guarantee_limit ?? o.deposit_protection_amount ?? bank?.deposit_protection_amount ?? null,
    deposit_protection_authority: o.deposit_protection_authority ?? bank?.regulator_name ?? null,
    deposit_guarantee_country:
      o.deposit_guarantee_country ?? bank?.deposit_guarantee_country_code ?? null,
    deposit_guarantee_limit: o.deposit_guarantee_limit ?? null,
    source_name: o.source_name ?? null,
    source_url: o.source_url ?? null,
    status: o.status ?? (o.is_active === false ? 'inactive' : 'active'),
    is_active: o.is_active !== false,
    is_demo: Boolean(o.is_demo),
    data_source: o.data_source ?? null,
    verified_at: o.verified_at ?? null,
    valid_from: o.valid_from ?? null,
    valid_until: o.valid_until ?? null,
    source_timestamp: o.source_timestamp ?? null,
    source_retrieved_at: o.source_retrieved_at ?? null,
    verification_method: o.verification_method ?? null,
    banks: serializeBank(bank),
    no_min_amount: Boolean(cond.no_min_amount),
    no_max_amount: Boolean(cond.no_max_amount),
  };

  item.expected_yield = amount != null && amount > 0 ? computeYield(o, amount) : null;
  item.data_status = dataStatus(o);
  return item;
}

function amountMatches(o, amount) {
  if (amount == null) return true;
  if (o.min_amount != null && amount < Number(o.min_amount)) return false;
  if (o.max_amount != null && amount > Number(o.max_amount)) return false;
  return true;
}

function dataStatusRank(item) {
  if (item.data_status === 'verified') return 0;
  if (item.data_status === 'unverified') return 1;
  if (item.data_status === 'demo') return 2;
  return 3;
}

function compareBy(sort) {
  return (a, b) => {
    const ra = dataStatusRank(a);
    const rb = dataStatusRank(b);
    if (ra !== rb) return ra - rb;
    const yield_ = (x) => x.expected_yield?.gross_return_eur ?? null;
    let d = 0;
    switch (sort) {
      case 'expected_yield':
        d = -((yield_(a) || 0) - (yield_(b) || 0));
        break;
      case 'expected_yield_asc':
        d = (yield_(a) ?? 1e18) - (yield_(b) ?? 1e18);
        break;
      case 'rate':
        d = -((a.interest_rate || 0) - (b.interest_rate || 0));
        break;
      case 'rate_asc':
        d = (a.interest_rate || 0) - (b.interest_rate || 0);
        break;
      case 'term':
        d = (a.term_months || 0) - (b.term_months || 0);
        break;
      case 'term_desc':
        d = -((a.term_months || 0) - (b.term_months || 0));
        break;
      case 'min_amount':
        d = (a.min_amount || 0) - (b.min_amount || 0);
        break;
      case 'min_amount_desc':
        d = -((a.min_amount || 0) - (b.min_amount || 0));
        break;
      case 'bank_name':
        d = String(a.banks?.name || '')
          .toLowerCase()
          .localeCompare(String(b.banks?.name || '').toLowerCase(), 'de');
        break;
      default:
        d = -((a.interest_rate || 0) - (b.interest_rate || 0));
    }
    if (d !== 0) return d;
    return String(a.id).localeCompare(String(b.id));
  };
}

function resolveBank(o) {
  let bank = o.bank_slug ? banksBySlug.get(o.bank_slug) : null;
  if (!bank && o.bank_id != null) bank = banksById.get(String(o.bank_id));
  return bank || null;
}

/** Mirror von GET /api/public/savings-offers */
function querySavingsOffers({
  activeOnly = true,
  includeExpired = false,
  dataStatus: statusFilter = 'all',
  limit = 500,
  page = 1,
  productType = null,
  countries = [],
  dgsCountries = [],
  rateMin = null,
  rateMax = null,
  termMin = null,
  termMax = null,
  amount = null,
  newCustomersOnly = null,
  sort = 'expected_yield',
  search = null,
} = {}) {
  const now = Date.now();
  const searchLc = String(search || '').trim().toLowerCase();
  const items = [];

  for (const o of offersRaw) {
    if (activeOnly && o.is_active === false) continue;
    if (productType && String(o.product_type || '').toLowerCase() !== String(productType).toLowerCase())
      continue;
    if (countries.length && !countries.includes(o.country)) continue;
    if (dgsCountries.length && !dgsCountries.includes(o.deposit_guarantee_country)) continue;
    if (rateMin != null && !(Number(o.interest_rate) >= rateMin)) continue;
    if (rateMax != null && !(Number(o.interest_rate) <= rateMax)) continue;
    if (termMin != null || termMax != null) {
      const t = o.term_months;
      if (t == null) {
        if (termMin !== 0) continue;
      } else {
        if (termMin != null && !(t >= termMin)) continue;
        if (termMax != null && !(t <= termMax)) continue;
      }
    }
    if (newCustomersOnly === true && o.new_customers_only !== true) continue;
    if (!amountMatches(o, amount)) continue;
    if (!includeExpired && o.valid_until && new Date(o.valid_until).getTime() < now) continue;

    const status = dataStatus(o);
    if (statusFilter === 'verified' && status !== 'verified') continue;
    if (statusFilter === 'unverified' && status !== 'unverified') continue;
    if (statusFilter === 'demo' && status !== 'demo') continue;

    const bank = resolveBank(o);
    if (searchLc) {
      const hay = [bank?.name || '', bank?.country || '', o.product_name || '', o.bank_slug || '']
        .join(' ')
        .toLowerCase();
      if (!hay.includes(searchLc)) continue;
    }
    items.push(serializeOffer(o, bank, amount));
  }

  const total = items.length;
  items.sort(compareBy(sort));
  const start = (page - 1) * limit;
  const pageItems = items.slice(start, start + limit);
  const demoCount = items.filter((i) => i.is_demo).length;

  return {
    items: pageItems,
    count: pageItems.length,
    total,
    page,
    limit,
    has_more: start + limit < total,
    has_demo: demoCount > 0,
    demo_count: demoCount,
    sort,
  };
}

/** Mirror von GET /api/public/savings-offers/facets */
function savingsOfferFacets({ activeOnly = true, productType = null } = {}) {
  const counters = {
    countries: new Map(),
    dgs: new Map(),
    productTypes: new Map(),
    terms: new Map(),
    frequencies: new Map(),
  };
  let rateMin = null;
  let rateMax = null;
  let amountMin = null;
  let amountMax = null;
  let total = 0;

  const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);

  for (const o of offersRaw) {
    if (activeOnly && o.is_active === false) continue;
    if (productType && String(o.product_type || '').toLowerCase() !== String(productType).toLowerCase())
      continue;
    total += 1;
    const pt = String(o.product_type || '').toLowerCase();
    if (pt) bump(counters.productTypes, pt);
    let cc = typeof o.country === 'string' && o.country.length === 2 ? o.country : null;
    if (!cc && o.bank_slug) cc = banksBySlug.get(o.bank_slug)?.country_code || null;
    if (cc) bump(counters.countries, cc);
    if (o.deposit_guarantee_country) bump(counters.dgs, o.deposit_guarantee_country);
    bump(counters.terms, o.term_months == null ? 'flex' : o.term_months);
    const freq = o.interest_frequency || o.interest_credit_frequency;
    if (freq) bump(counters.frequencies, freq);
    const r = Number(o.interest_rate);
    if (Number.isFinite(r)) {
      rateMin = rateMin == null ? r : Math.min(rateMin, r);
      rateMax = rateMax == null ? r : Math.max(rateMax, r);
    }
    if (Number.isFinite(Number(o.min_amount)))
      amountMin = amountMin == null ? Number(o.min_amount) : Math.min(amountMin, Number(o.min_amount));
    if (Number.isFinite(Number(o.max_amount)))
      amountMax = amountMax == null ? Number(o.max_amount) : Math.max(amountMax, Number(o.max_amount));
  }

  const countryList = (m) =>
    [...m.entries()]
      .map(([code, count]) => ({
        code,
        name: countryByCode.get(code)?.name || code,
        name_de: countryByCode.get(code)?.name_de || code,
        count,
      }))
      .sort((a, b) => b.count - a.count);

  return {
    countries: countryList(counters.countries),
    dgs_countries: countryList(counters.dgs),
    product_types: [...counters.productTypes.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count),
    terms_available: [...counters.terms.entries()]
      .map(([k, count]) => ({ term_months: k === 'flex' ? null : k, count }))
      .sort((a, b) => {
        const an = a.term_months == null ? 1 : 0;
        const bn = b.term_months == null ? 1 : 0;
        if (an !== bn) return an - bn;
        return (a.term_months || 0) - (b.term_months || 0);
      }),
    interest_frequencies: [...counters.frequencies.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count),
    rate_range: rateMin == null ? null : { min: rateMin, max: rateMax },
    amount_range: amountMin == null ? null : { min: amountMin, max: amountMax },
    total,
  };
}

/** Mirror von GET /api/public/partner-banks */
function listPartnerBanks() {
  return banksRaw
    .filter((b) => b.is_active !== false)
    .map(serializeBank)
    .sort(
      (a, b) =>
        String(a.country_code || '').localeCompare(String(b.country_code || '')) ||
        String(a.name).localeCompare(String(b.name), 'de'),
    );
}

/**
 * Bequemer Zugriff mit demselben Query-String, den die Seite früher an
 * `/api/public/savings-offers` geschickt hat.
 */
function querySavingsOffersFromSearch(queryString) {
  const p = new URLSearchParams(queryString || '');
  const csv = (k) => (p.get(k) ? p.get(k).split(',').filter(Boolean) : []);
  const num = (k) => {
    const v = p.get(k);
    if (v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return querySavingsOffers({
    productType: p.get('product_type') || null,
    countries: csv('countries'),
    dgsCountries: csv('dgs_countries'),
    rateMin: num('rate_min'),
    rateMax: num('rate_max'),
    termMin: num('term_min'),
    termMax: num('term_max'),
    amount: num('amount'),
    newCustomersOnly: p.get('new_customers_only') === 'true' ? true : null,
    sort: p.get('sort') || 'expected_yield',
    search: p.get('search') || null,
    limit: num('limit') || 100,
    page: num('page') || 1,
  });
}

/**
 * Portierung von GET /api/public/savings-offers/{id}/rate-history.
 * Für den Dump liegt keine Verlaufs-Collection vor → leere Liste
 * (DATA_SOURCE_MISSING statt erfundener Kurve).
 */
async function getOfferRateHistory(_offerId) {
  return [];
}

  return { COUNTRIES, querySavingsOffers, savingsOfferFacets, listPartnerBanks, querySavingsOffersFromSearch, getOfferRateHistory, serializeBank, banksBySlug };
}
