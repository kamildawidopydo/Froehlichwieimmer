import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Link, useNavigate, useSearchParams } from '@/lib/routerCompat';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { X, RefreshCw, SlidersHorizontal, Search, LayoutGrid, Table2, Info } from 'lucide-react';

import OfferInterestModal from '@/components/OfferInterestModal';
import OfferDetailDrawer from '@/components/comparison/OfferDetailDrawer';
import CentralCalculator from '@/components/comparison/CentralCalculator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import siteImages from '@/data/siteImages';
import ComparisonOfferCard from '@/components/comparison/ComparisonOfferCard';
import ComparisonOfferTable from '@/components/comparison/ComparisonOfferTable';
import MarketContextStrip from '@/components/comparison/MarketContextStrip';
import CountryExplorer from '@/components/comparison/CountryExplorer';
import ComparisonBar from '@/components/comparison/ComparisonBar';
import ComparisonModal from '@/components/comparison/ComparisonModal';
import CountryFlagIcon from '@/components/CountryFlagIcon';
import { getCountryLabelDe } from '@/lib/countryFlags';
import { computeYield, formatEur } from '@/lib/savingsCalculator';
import { fetchInterestRateHistoryBatch } from '@/lib/interestRateHistory';
import { fetchOfferReviewStatsBatch } from '@/lib/offerReviews';
import { isExcludedSavingsBankSlug } from '@/lib/comparisonCatalog';
import { enrichOffersWithBonus } from '@/lib/offerBonus';
import { logEvent, EVENTS } from '@/lib/activityLogger';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { useAuth } from '@/context/AuthContext';
import {
  querySavingsOffersFromSearch,
  savingsOfferFacets,
} from '@/lib/savingsOffersLocal';

const PRODUCT_TABS = [
  { code: '', label: 'Alle' },
  { code: 'tagesgeld', label: 'Tagesgeld' },
  { code: 'festgeld', label: 'Festgeld' },
];

const AMOUNT_PRESETS = [5000, 10000, 25000, 50000, 100000];
const MAX_COMPARE = 4;

const SORT_OPTIONS = [
  { value: 'expected_yield', label: 'Erwarteter Ertrag' },
  { value: 'rate', label: 'Zinssatz' },
  { value: 'term_desc', label: 'Laufzeit (lang → kurz)' },
  { value: 'term', label: 'Laufzeit (kurz → lang)' },
  { value: 'min_amount', label: 'Mindestanlage' },
  { value: 'bank_name', label: 'Bank A–Z' },
];

const DEFAULTS = {
  product_type: '',
  countries: [],
  dgs_countries: [],
  rate_min: null,
  rate_max: null,
  term_min: null,
  term_max: null,
  amount: '',
  new_customers_only: false,
  sort: 'expected_yield',
  search: '',
  compare: [],
};

function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

// --- URL <-> filters ------------------------------------------------------
function readFilters(sp) {
  const arr = (k) => (sp.get(k) ? sp.get(k).split(',').filter(Boolean) : []);
  const num = (k) => {
    const v = sp.get(k);
    if (v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    product_type: sp.get('type') || '',
    countries: arr('countries'),
    dgs_countries: arr('dgs'),
    rate_min: num('rate_min'),
    rate_max: num('rate_max'),
    term_min: num('term_min'),
    term_max: num('term_max'),
    amount: sp.get('amount') || '',
    new_customers_only: sp.get('new') === '1',
    sort: sp.get('sort') || 'expected_yield',
    search: sp.get('q') || '',
    compare: arr('compare'),
  };
}

function writeFilters(sp, f) {
  const set = (k, v) => (v ? sp.set(k, v) : sp.delete(k));
  set('type', f.product_type);
  set('countries', f.countries.join(','));
  set('dgs', f.dgs_countries.join(','));
  set('rate_min', f.rate_min != null ? String(f.rate_min) : '');
  set('rate_max', f.rate_max != null ? String(f.rate_max) : '');
  set('term_min', f.term_min != null ? String(f.term_min) : '');
  set('term_max', f.term_max != null ? String(f.term_max) : '');
  set('amount', f.amount || '');
  set('new', f.new_customers_only ? '1' : '');
  set('sort', f.sort !== 'expected_yield' ? f.sort : '');
  set('q', f.search || '');
  set('compare', f.compare.join(','));
  return sp;
}

function buildQuery(filters) {
  const params = new URLSearchParams();
  if (filters.product_type) params.set('product_type', filters.product_type);
  if (filters.countries.length) params.set('countries', filters.countries.join(','));
  if (filters.dgs_countries.length) params.set('dgs_countries', filters.dgs_countries.join(','));
  if (filters.rate_min != null) params.set('rate_min', String(filters.rate_min));
  if (filters.rate_max != null) params.set('rate_max', String(filters.rate_max));
  if (filters.term_min != null) params.set('term_min', String(filters.term_min));
  if (filters.term_max != null) params.set('term_max', String(filters.term_max));
  if (filters.amount) params.set('amount', filters.amount);
  if (filters.new_customers_only) params.set('new_customers_only', 'true');
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.search) params.set('search', filters.search);
  params.set('limit', '100');
  return params.toString();
}

// --- Small reusable UI bits ----------------------------------------------
const FilterBadge = memo(({ label, onRemove, testid }) => (
  <span
    data-testid={testid}
    className="inline-flex items-center gap-2 border border-bank-border bg-white px-3 py-1.5 text-[12px] font-medium text-bank-text"
  >
    <span aria-hidden className="h-1 w-1 rounded-full bg-bank-gold" />
    {label}
    <button
      type="button"
      onClick={onRemove}
      className="text-bank-text-muted hover:text-bank-primary"
      aria-label="Entfernen"
    >
      <X className="h-3 w-3" strokeWidth={LUCIDE_STROKE} />
    </button>
  </span>
));

// --- Filter Panel (uses facets) ------------------------------------------
function FilterPanel({ filters, facets, onChange, onReset }) {
  const rateRange = facets?.rate_range || { min: 0, max: 10 };
  const rateMin = filters.rate_min ?? rateRange.min ?? 0;
  const rateMax = filters.rate_max ?? rateRange.max ?? 10;
  const termsAvailable = facets?.terms_available || [];
  const numericTerms = termsAvailable.map((t) => t.term_months).filter((t) => t !== null);
  const termMinAvail = numericTerms.length ? Math.min(...numericTerms) : 0;
  const termMaxAvail = numericTerms.length ? Math.max(...numericTerms) : 60;
  const currentTermMin = filters.term_min ?? 0;
  const currentTermMax = filters.term_max ?? termMaxAvail;

  return (
    <div className="space-y-6" data-testid="filter-panel">
      {/* Suche */}
      <div>
        <p className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.24em] text-bank-text-muted">
          Bank / Land
        </p>
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-bank-text-muted"
            strokeWidth={LUCIDE_STROKE}
          />
          <Input
            data-testid="filter-search"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="z. B. ING oder Spanien"
            className="h-9 rounded-none border-bank-border bg-bank-bg pl-9 text-[13px]"
          />
        </div>
      </div>

      {/* Anlagebetrag */}
      <div>
        <p className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.24em] text-bank-text-muted">
          Anlagebetrag (€)
        </p>
        <Input
          type="number"
          data-testid="filter-amount"
          value={filters.amount}
          onChange={(e) => onChange({ amount: e.target.value })}
          placeholder="z. B. 25000"
          className="h-9 rounded-none border-bank-border bg-bank-bg text-[13px]"
          min="0"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {AMOUNT_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              data-testid={`filter-amount-preset-${p}`}
              onClick={() => onChange({ amount: String(p) })}
              className={cn(
                'border px-2 py-1 font-mono text-[10.5px]',
                String(p) === filters.amount
                  ? 'border-bank-primary bg-bank-primary/10 text-bank-primary'
                  : 'border-bank-border text-bank-text-muted hover:border-bank-primary/40'
              )}
            >
              {p.toLocaleString('de-DE')} €
            </button>
          ))}
        </div>
      </div>

      {/* Zinssatz */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-bank-text-muted">
            Zinssatz
          </p>
          <span className="rate-figure text-sm tabular-nums text-bank-text" data-numeric>
            {rateMin.toFixed(2)}–{rateMax.toFixed(2)}
            <span className="ml-0.5 font-mono text-[9px] text-bank-gold">%</span>
          </span>
        </div>
        <Slider
          data-testid="filter-rate-slider"
          min={rateRange.min ?? 0}
          max={rateRange.max ?? 10}
          step={0.05}
          value={[rateMin, rateMax]}
          onValueChange={(v) => onChange({ rate_min: v[0], rate_max: v[1] })}
        />
      </div>

      {/* Laufzeit (dynamisch aus facets) */}
      {filters.product_type !== 'tagesgeld' && (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-bank-text-muted">
              Laufzeit
            </p>
            <span className="rate-figure text-sm tabular-nums text-bank-text" data-numeric>
              {currentTermMin}–{currentTermMax}
              <span className="ml-0.5 font-mono text-[9px] text-bank-gold">M</span>
            </span>
          </div>
          <Slider
            data-testid="filter-term-slider"
            min={0}
            max={termMaxAvail}
            step={1}
            value={[currentTermMin, currentTermMax]}
            onValueChange={(v) => onChange({ term_min: v[0], term_max: v[1] })}
          />
          <div className="mt-1 flex justify-between font-mono text-[9px] text-bank-text-muted">
            <span>Flexibel</span>
            <span>{termMaxAvail} M</span>
          </div>
        </div>
      )}

      {/* Länder (aus facets) */}
      {facets?.countries?.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-bank-text-muted">
              Land der Bank
            </p>
            {filters.countries.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ countries: [] })}
                className="font-mono text-[10px] text-bank-gold underline-offset-4 hover:underline"
              >
                zurücksetzen
              </button>
            )}
          </div>
          <div className="grid max-h-56 grid-cols-1 gap-y-1 overflow-y-auto pr-1">
            {facets.countries.map((c) => (
              <label
                key={c.code}
                className="flex cursor-pointer items-center gap-2 text-[12.5px] text-bank-text"
              >
                <input
                  type="checkbox"
                  data-testid={`filter-country-${c.code}`}
                  checked={filters.countries.includes(c.code)}
                  onChange={() =>
                    onChange({
                      countries: filters.countries.includes(c.code)
                        ? filters.countries.filter((x) => x !== c.code)
                        : [...filters.countries, c.code],
                    })
                  }
                  className="h-3.5 w-3.5 rounded-sm border-bank-border text-bank-primary focus:ring-bank-accent/40"
                />
                <CountryFlagIcon country={c.code} size="xs" />
                <span className="flex-1 truncate">
                  {getCountryLabelDe(c.code) || c.name_de}
                </span>
                <span className="font-mono text-[10.5px] text-bank-text-muted">{c.count}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Einlagensicherungsland */}
      {facets?.dgs_countries?.length > 0 && (
        <div>
          <p className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.24em] text-bank-text-muted">
            Einlagensicherung
          </p>
          <div className="grid max-h-40 grid-cols-2 gap-x-2 gap-y-1 overflow-y-auto pr-1">
            {facets.dgs_countries.map((c) => (
              <label
                key={c.code}
                className="flex cursor-pointer items-center gap-1.5 text-[12px] text-bank-text"
              >
                <input
                  type="checkbox"
                  data-testid={`filter-dgs-${c.code}`}
                  checked={filters.dgs_countries.includes(c.code)}
                  onChange={() =>
                    onChange({
                      dgs_countries: filters.dgs_countries.includes(c.code)
                        ? filters.dgs_countries.filter((x) => x !== c.code)
                        : [...filters.dgs_countries, c.code],
                    })
                  }
                  className="h-3.5 w-3.5 rounded-sm border-bank-border text-bank-primary"
                />
                <CountryFlagIcon country={c.code} size="xs" />
                <span className="truncate">{getCountryLabelDe(c.code) || c.code}</span>
                <span className="ml-auto font-mono text-[10px] text-bank-text-muted">{c.count}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Neukunden */}
      <div>
        <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-bank-text">
          <input
            type="checkbox"
            data-testid="filter-new-customers"
            checked={filters.new_customers_only}
            onChange={(e) => onChange({ new_customers_only: e.target.checked })}
            className="h-3.5 w-3.5 rounded-sm border-bank-border text-bank-primary"
          />
          Nur Neukunden-Aktionen
        </label>
      </div>

      <div className="border-t border-bank-border pt-4">
        <Button
          variant="outline-ink"
          className="w-full"
          data-testid="filter-reset"
          onClick={onReset}
        >
          Alle Filter zurücksetzen
        </Button>
      </div>
    </div>
  );
}

// --- Category highlights (replaces "Top 3" spotlight) --------------------
function CategoryHighlights({ offers }) {
  if (!offers.length) return null;
  const withYield = offers.filter((o) => o.expected_yield?.gross_return_eur != null);
  const topYield = withYield.length ? [...withYield].sort((a, b) => (b.expected_yield.gross_return_eur - a.expected_yield.gross_return_eur))[0] : null;
  const topRate = [...offers].sort((a, b) => (b.interest_rate || 0) - (a.interest_rate || 0))[0];
  const longest = [...offers].filter((o) => o.term_months).sort((a, b) => (b.term_months || 0) - (a.term_months || 0))[0];
  const cards = [
    topYield && {
      key: 'yield',
      label: 'Hoher erwarteter Ertrag',
      offer: topYield,
      metric: formatEur(topYield.expected_yield.gross_return_eur),
      sub: topYield.expected_yield.horizon_months + ' M Betrachtung',
    },
    topRate && {
      key: 'rate',
      label: 'Hoher Zinssatz',
      offer: topRate,
      metric: (topRate.interest_rate ?? 0).toFixed(2).replace('.', ',') + ' %',
      sub: 'p.a. nominal',
    },
    longest && {
      key: 'term',
      label: 'Langfristige Kondition',
      offer: longest,
      metric: (longest.term_months || 0) + ' M',
      sub: 'Laufzeit',
    },
  ].filter(Boolean);
  if (!cards.length) return null;
  return (
    <div className="mb-10 grid gap-3 sm:grid-cols-3" data-testid="category-highlights">
      {cards.map((c) => (
        <div
          key={c.key}
          className="border border-bank-border bg-white p-5"
          data-testid={`category-${c.key}`}
        >
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
            {c.label}
          </p>
          <p className="mt-3 font-display text-2xl font-light text-bank-primary" data-numeric>
            {c.metric}
          </p>
          <p className="mt-1 text-[11.5px] text-bank-text-muted">{c.sub}</p>
          <p className="mt-4 truncate text-[13px] font-medium text-bank-text">
            {c.offer.banks?.name || c.offer.product_name}
          </p>
        </div>
      ))}
    </div>
  );
}

// --- Main page -----------------------------------------------------------
const SavingsComparison = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [filters, setFilters] = useState(() => readFilters(searchParams));
  const [facets, setFacets] = useState(null);
  const [offers, setOffers] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasDemo, setHasDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [reviewStatsMap, setReviewStatsMap] = useState(() => new Map());
  const [rateHistoryMap, setRateHistoryMap] = useState(() => new Map());
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState('cards');
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [interestOffer, setInterestOffer] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const debouncedSearch = useDebounced(filters.search, 350);
  const debouncedAmount = useDebounced(filters.amount, 400);

  // Stable primitive-string derived from filters + debounced search/amount.
  // Wird für Fetch-Deps und URL-Sync verwendet, sodass rein UI-lokale State-Changes
  // (compare, favorites) keinen erneuten Fetch/Reroute auslösen.
  const queryString = useMemo(
    () => buildQuery({ ...filters, search: debouncedSearch, amount: debouncedAmount }),
    [filters, debouncedSearch, debouncedAmount],
  );

  // Persist filters → URL. Nur die querystringrelevanten Felder werden gespiegelt.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    writeFilters(next, filters);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [filters, searchParams, setSearchParams]);

  // Facetten (Counts pro Land/DGS/Laufzeit) — lokale Portierung von /facets.
  useEffect(() => {
    try {
      setFacets(savingsOfferFacets({ productType: filters.product_type || null }));
    } catch (err) {
      console.error('facets error', err);
    }
  }, [filters.product_type]);

  // Fetch offers (server-side filtering/sorting/pagination).
  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const res = querySavingsOffersFromSearch(queryString);
      const items = (res?.items || [])
        .map((o) => ({
          ...o,
          bank_name: o.banks?.name || o.product_name || '',
          bank_slug: o.banks?.slug || o.bank_slug || '',
          country: o.country_code || o.country || '',
          bank_logo: o.banks?.logo_url || null,
          website_url: o.banks?.website_url || null,
          deposit_protection: o.banks?.deposit_protection || o.deposit_protection || '',
          deposit_protection_amount:
            o.banks?.deposit_protection_amount || o.deposit_protection_amount || '',
          founded_year: o.banks?.founded_year ?? null,
          credit_rating: o.banks?.credit_rating ?? null,
          regulator_name: o.banks?.regulator_name ?? null,
        }))
        .filter((o) => !isExcludedSavingsBankSlug(o.bank_slug));
      setOffers(enrichOffersWithBonus(items));
      setTotal(res?.total ?? items.length);
      setHasDemo(Boolean(res?.has_demo));
      const ids = items.map((o) => o.id);
      if (ids.length > 0) {
        const [{ map }, historyMap] = await Promise.all([
          fetchOfferReviewStatsBatch(ids),
          fetchInterestRateHistoryBatch(ids),
        ]);
        setReviewStatsMap(map);
        setRateHistoryMap(historyMap);
      }
    } catch (err) {
      console.error('SavingsComparison fetchOffers', err);
      toast.error('Fehler beim Laden der Angebote');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Compare selection helpers
  const compareIds = filters.compare;
  const offersById = useMemo(() => new Map(offers.map((o) => [o.id, o])), [offers]);
  const compareOffers = useMemo(
    () => compareIds.map((id) => offersById.get(id)).filter(Boolean),
    [compareIds, offersById]
  );

  const toggleCompare = useCallback(
    (id) => {
      setFilters((prev) => {
        if (prev.compare.includes(id)) {
          return { ...prev, compare: prev.compare.filter((x) => x !== id) };
        }
        if (prev.compare.length >= MAX_COMPARE) {
          toast.info(`Max. ${MAX_COMPARE} Angebote gleichzeitig vergleichbar.`);
          return prev;
        }
        return { ...prev, compare: [...prev.compare, id] };
      });
    },
    []
  );

  const clearCompare = () => setFilters((prev) => ({ ...prev, compare: [] }));

  const updateFilter = (patch) => setFilters((prev) => ({ ...prev, ...patch }));
  const resetFilters = () => setFilters({ ...DEFAULTS });

  // Active filter chips
  const chips = useMemo(() => {
    const c = [];
    if (filters.product_type)
      c.push({
        key: 'type',
        label: PRODUCT_TABS.find((t) => t.code === filters.product_type)?.label || filters.product_type,
        onRemove: () => updateFilter({ product_type: '' }),
      });
    filters.countries.forEach((cc) =>
      c.push({
        key: `country-${cc}`,
        label: getCountryLabelDe(cc) || cc,
        onRemove: () =>
          updateFilter({ countries: filters.countries.filter((x) => x !== cc) }),
      })
    );
    filters.dgs_countries.forEach((cc) =>
      c.push({
        key: `dgs-${cc}`,
        label: `Sicherung ${getCountryLabelDe(cc) || cc}`,
        onRemove: () =>
          updateFilter({ dgs_countries: filters.dgs_countries.filter((x) => x !== cc) }),
      })
    );
    if (filters.amount)
      c.push({
        key: 'amount',
        label: `Anlage: ${Number(filters.amount).toLocaleString('de-DE')} €`,
        onRemove: () => updateFilter({ amount: '' }),
      });
    if (filters.rate_min != null || filters.rate_max != null)
      c.push({
        key: 'rate',
        label: `Zins: ${filters.rate_min ?? '–'}–${filters.rate_max ?? '–'} %`,
        onRemove: () => updateFilter({ rate_min: null, rate_max: null }),
      });
    if (filters.term_min != null || filters.term_max != null)
      c.push({
        key: 'term',
        label: `Laufzeit: ${filters.term_min ?? 0}–${filters.term_max ?? '∞'} M`,
        onRemove: () => updateFilter({ term_min: null, term_max: null }),
      });
    if (filters.new_customers_only)
      c.push({
        key: 'new',
        label: 'Nur Neukunden',
        onRemove: () => updateFilter({ new_customers_only: false }),
      });
    if (filters.search)
      c.push({
        key: 'search',
        label: `„${filters.search}“`,
        onRemove: () => updateFilter({ search: '' }),
      });
    return c;
  }, [filters]);

  const handleOpenDetail = (offer) => {
    setSelectedOffer(offer);
    setShowDrawer(true);
  };
  const handleOpenInterest = (offer) => {
    setInterestOffer(offer);
    setShowInterestModal(true);
  };
  const toggleFavorite = async (e, offerId) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Bitte melden Sie sich an, um Favoriten zu speichern');
      return;
    }
    setFavorites((prev) => {
      const wasFav = prev.includes(offerId);
      const next = wasFav ? prev.filter((id) => id !== offerId) : [...prev, offerId];
      logEvent(wasFav ? EVENTS.FAVORITE_REMOVE : EVENTS.FAVORITE_ADD, { offer_id: offerId });
      toast.success(wasFav ? 'Aus Favoriten entfernt' : 'Zu Favoriten hinzugefügt');
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-bank-bg pb-24">
      <PageMeta
        title="Festgeld & Tagesgeld Vergleich"
        description="Vergleichen Sie Zinsen, Laufzeiten und Einlagensicherung europäischer Partnerbanken auf einer Plattform."
        path="/comparison"
      />

      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-bank-border bg-bank-bg">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-mesh-soft opacity-80" />
        <div className="relative mx-auto max-w-[1440px] px-5 pb-10 pt-10 sm:px-8 sm:pb-14 lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-x-12 lg:px-12 lg:pb-16 lg:pt-14">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 lg:py-6"
          >
            <h1 className="font-display max-w-[14ch] text-display-lg font-light leading-[0.98] tracking-[-0.015em] text-bank-text sm:text-display-xl">
              <span className="block">Sparangebote</span>
              <span className="block">
                im{' '}
                <span
                  className="italic text-bank-gold"
                  style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                >
                  Überblick.
                </span>
              </span>
            </h1>
            <p className="mt-6 max-w-[36rem] text-[17px] leading-relaxed text-bank-text-muted">
              <span className="text-bank-text">Festgeld und Tagesgeld quer durch Europa.</span>{' '}
              Vergleichen Sie Zinsen, Laufzeiten, Aktionskonditionen und Einlagensicherung – mit
              transparenter Ertragsberechnung.
            </p>
          </motion.div>
          <div className="mt-8 lg:col-span-5 lg:mt-0">
            <div className="relative isolate mx-auto h-full w-full max-w-[560px] overflow-hidden rounded-[28px] border border-bank-border bg-bank-surface shadow-editorial-lg lg:ml-auto lg:mr-0">
              <div className="relative aspect-[3/4] lg:h-full lg:aspect-auto">
                <img
                  src={siteImages.comparison.hero}
                  alt={siteImages.comparison.heroAlt}
                  className="absolute inset-0 h-full w-full object-cover object-[50%_30%]"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:flex lg:items-start lg:gap-12 lg:px-12 lg:py-12">
        <div className="min-w-0 flex-1">
          {/* Country Explorer */}
          <CountryExplorer
            countries={facets?.countries || []}
            selected={filters.countries}
            onToggle={(cc) =>
              updateFilter({
                countries: filters.countries.includes(cc)
                  ? filters.countries.filter((x) => x !== cc)
                  : [...filters.countries, cc],
              })
            }
          />

          <MarketContextStrip />

          {/* Session 93 · Phase 4 — Zentraler Rechner direkt über den Ergebnissen */}
          <div className="my-8">
            <CentralCalculator
              facets={facets ? { ...facets, __bank_count: new Set((facets.countries || []).map((c) => c.code)).size ? undefined : null } : null}
              initialAmount={filters.amount ? Number(filters.amount) : 25000}
              initialType={filters.product_type || 'tagesgeld'}
              initialTerm={filters.term_min || null}
              hasDemo={hasDemo}
              onCompare={(v) => {
                updateFilter({
                  amount: v.amount,
                  product_type: v.product_type,
                  term_min: v.term_min,
                  term_max: v.term_max,
                });
                setTimeout(() => {
                  const el = document.querySelector('[data-testid="result-count"]');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 120);
              }}
            />
          </div>

          {/* Category highlights (computed from filtered results) */}
          {!loading && offers.length > 0 && <CategoryHighlights offers={offers} />}

          {/* Toolbar */}
          <div className="mb-6 flex flex-col gap-4 border-y border-bank-border py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  data-testid="mobile-filters-open"
                  className="inline-flex items-center gap-2 border border-bank-border bg-white px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.18em] text-bank-text lg:hidden"
                  onClick={() => setShowMobileFilters(true)}
                >
                  <SlidersHorizontal className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                  Filter
                  {chips.length > 0 && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center border border-bank-gold/55 bg-bank-gold/15 px-1 font-mono text-[10px] text-bank-gold">
                      {chips.length}
                    </span>
                  )}
                </button>
                <p className="flex items-baseline gap-2 text-[13px] text-bank-text-muted" data-testid="result-count">
                  {loading ? (
                    'Lädt…'
                  ) : (
                    <>
                      <span className="rate-figure text-2xl text-bank-primary" data-numeric>
                        {offers.length}
                      </span>
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.22em]">
                        von {total} Angeboten
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div role="group" aria-label="Ansichtstyp" className="hidden items-center border border-bank-border bg-white p-0.5 sm:flex">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    aria-pressed={viewMode === 'table'}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em]',
                      viewMode === 'table' ? 'bg-bank-ink text-white' : 'text-bank-text-muted hover:text-bank-text'
                    )}
                  >
                    <Table2 className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} />
                    Tabelle
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    aria-pressed={viewMode === 'cards'}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em]',
                      viewMode === 'cards' ? 'bg-bank-ink text-white' : 'text-bank-text-muted hover:text-bank-text'
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} />
                    Karten
                  </button>
                </div>
                <select
                  data-testid="sort-select"
                  value={filters.sort}
                  onChange={(e) => updateFilter({ sort: e.target.value })}
                  className="h-11 border border-bank-border bg-white px-3 text-sm text-bank-text focus:outline-none focus:ring-2 focus:ring-bank-accent/40"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      Sortieren: {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div role="tablist" aria-label="Anlagetyp" className="flex flex-wrap gap-2">
              {PRODUCT_TABS.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  role="tab"
                  data-testid={`product-tab-${tab.code || 'all'}`}
                  aria-selected={filters.product_type === tab.code}
                  onClick={() => updateFilter({ product_type: tab.code })}
                  className={cn(
                    'inline-flex items-center px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em]',
                    'border',
                    filters.product_type === tab.code
                      ? 'border-bank-ink bg-bank-ink text-white'
                      : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/35 hover:text-bank-text'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chips */}
          {chips.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <FilterBadge
                  key={chip.key}
                  label={chip.label}
                  onRemove={chip.onRemove}
                  testid={`chip-${chip.key}`}
                />
              ))}
              {chips.length > 1 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  data-testid="chips-reset-all"
                  className="font-mono text-[11px] uppercase tracking-[0.18em] text-bank-gold underline-offset-4 hover:underline"
                >
                  · Alle löschen
                </button>
              )}
            </div>
          )}

          {/* Result list */}
          {loading && (
            <div className="border border-bank-border bg-white px-8 py-24 text-center" data-testid="loading-state">
              <RefreshCw className="mx-auto mb-5 h-8 w-8 animate-spin text-bank-primary" strokeWidth={LUCIDE_STROKE} />
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
                Angebote werden geladen…
              </p>
            </div>
          )}

          {!loading && offers.length === 0 && (
            <div className="border border-bank-border bg-white px-8 py-24 text-center" data-testid="empty-state">
              <SlidersHorizontal className="mx-auto mb-5 h-10 w-10 text-bank-text-muted/30" strokeWidth={LUCIDE_STROKE} />
              <p className="font-display text-display-sm font-light text-bank-text">Keine Angebote</p>
              <p className="mt-4 text-sm text-bank-text-muted">Bitte Filter lockern oder zurücksetzen.</p>
              <div className="mt-8">
                <Button variant="outline-ink" size="lg" onClick={resetFilters}>
                  Filter zurücksetzen
                </Button>
              </div>
            </div>
          )}

          {!loading && offers.length > 0 && viewMode === 'cards' && (
            <div className="space-y-4" data-testid="offer-list">
              {offers.map((offer) => {
                const inCompare = compareIds.includes(offer.id);
                return (
                  <div key={offer.id} className="relative">
                    {/* Compare toggle overlay */}
                    <button
                      type="button"
                      data-testid={`compare-toggle-${offer.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleCompare(offer.id);
                      }}
                      className={cn(
                        'absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors',
                        inCompare
                          ? 'border-bank-primary bg-bank-primary text-white'
                          : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary hover:text-bank-primary'
                      )}
                      aria-pressed={inCompare}
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={inCompare}
                        aria-hidden
                        className="h-3 w-3 pointer-events-none accent-current"
                      />
                      Vergleichen
                    </button>
                    {/* Expected yield badge — nur wenn Berechnung vollständig */}
                    {offer.expected_yield?.gross_return_eur != null && (
                      <div
                        data-testid={`expected-yield-${offer.id}`}
                        className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 border border-bank-gold/60 bg-bank-gold/10 px-2.5 py-1 text-[11px] font-semibold text-bank-gold"
                      >
                        ≈ {formatEur(offer.expected_yield.gross_return_eur)} in{' '}
                        {offer.expected_yield.horizon_months} M
                      </div>
                    )}
                    {offer.expected_yield?.calculation_complete === false && (
                      <div
                        data-testid={`expected-yield-incomplete-${offer.id}`}
                        className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 border border-amber-500/60 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-800"
                        title="Der Zinssatz nach Ablauf der Zinsgarantie ist nicht bekannt."
                      >
                        Ertrag nicht vollständig
                      </div>
                    )}
                    <ComparisonOfferCard
                      offer={offer}
                      isFav={favorites.includes(offer.id)}
                      rateHistory={rateHistoryMap.get(offer.id) || []}
                      onOpen={handleOpenDetail}
                      navigate={navigate}
                      onInterest={handleOpenInterest}
                      onToggleFavorite={toggleFavorite}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {!loading && offers.length > 0 && viewMode === 'table' && (
            <ComparisonOfferTable
              offers={offers}
              favorites={favorites}
              isFeaturedBank={() => false}
              onOpen={handleOpenDetail}
              navigate={navigate}
              onToggleFavorite={toggleFavorite}
            />
          )}

          {total > offers.length && !loading && (
            <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-bank-text-muted">
              <Info className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} />
              Zeige die ersten {offers.length} von {total} passenden Angeboten. Bitte Filter verfeinern.
            </div>
          )}
        </div>

        {/* Filter sidebar (desktop) */}
        <aside className="mt-12 hidden w-full shrink-0 border border-bank-border bg-white p-5 shadow-editorial-sm sm:p-6 lg:mt-0 lg:block lg:w-[320px]">
          <div className="mb-5 flex items-center justify-between border-b border-bank-border pb-4">
            <Eyebrow>Kriterien</Eyebrow>
            {chips.length > 0 && (
              <span className="flex h-5 min-w-[1.5rem] items-center justify-center border border-bank-gold/55 bg-bank-gold/15 px-1.5 font-mono text-[10px] text-bank-gold">
                {chips.length}
              </span>
            )}
          </div>
          <FilterPanel filters={filters} facets={facets} onChange={updateFilter} onReset={resetFilters} />
        </aside>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[140] bg-black/45 backdrop-blur-sm lg:hidden"
              onClick={() => setShowMobileFilters(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.35 }}
              className="fixed inset-y-0 right-0 z-[150] flex w-full max-w-md flex-col border-l border-bank-border bg-white lg:hidden"
              data-testid="mobile-filters-drawer"
            >
              <div className="flex items-center justify-between border-b border-bank-border px-6 py-5">
                <Eyebrow>Kriterien</Eyebrow>
                <button
                  type="button"
                  data-testid="mobile-filters-close"
                  onClick={() => setShowMobileFilters(false)}
                  className="flex h-10 w-10 items-center justify-center text-bank-text-muted hover:bg-bank-bg"
                  aria-label="Filter schließen"
                >
                  <X className="h-5 w-5" strokeWidth={LUCIDE_STROKE} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <FilterPanel
                  filters={filters}
                  facets={facets}
                  onChange={updateFilter}
                  onReset={resetFilters}
                />
              </div>
              <div className="border-t border-bank-border bg-bank-bg p-6">
                <Button
                  variant="primary"
                  size="xl"
                  className="w-full"
                  onClick={() => setShowMobileFilters(false)}
                >
                  {offers.length} Angebot{offers.length !== 1 ? 'e' : ''} anzeigen
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Compare Bar (sticky) */}
      <ComparisonBar
        selected={compareIds}
        offersById={offersById}
        onRemove={toggleCompare}
        onClear={clearCompare}
        onOpen={() => setShowCompareModal(true)}
      />

      {/* Compare Modal */}
      {showCompareModal && (
        <ComparisonModal
          offers={compareOffers}
          onClose={() => setShowCompareModal(false)}
        />
      )}

      {/* Detail Drawer (Phase 4) + Interest Modal */}
      {selectedOffer && (
        <OfferDetailDrawer
          offer={selectedOffer}
          isOpen={showDrawer}
          onClose={() => setShowDrawer(false)}
        />
      )}
      {interestOffer && (
        <OfferInterestModal
          offer={interestOffer}
          isOpen={showInterestModal}
          onClose={() => setShowInterestModal(false)}
        />
      )}
    </div>
  );
};

export default SavingsComparison;
