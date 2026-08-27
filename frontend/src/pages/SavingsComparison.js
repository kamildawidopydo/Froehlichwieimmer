import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import OfferDetailModal from '@/components/OfferDetailModal';
import OfferInterestModal from '@/components/OfferInterestModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { logEvent, EVENTS } from '@/lib/activityLogger';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import siteImages from '@/data/siteImages';
import ComparisonOfferCard from '@/components/comparison/ComparisonOfferCard';
import CountryFlagIcon from '@/components/CountryFlagIcon';
import { getCountryLabelDe } from '@/lib/countryFlags';
import ComparisonOfferTable from '@/components/comparison/ComparisonOfferTable';
import MarketContextStrip from '@/components/comparison/MarketContextStrip';
import { fetchOfferReviewStatsBatch } from '@/lib/offerReviews';
import { fetchInterestRateHistoryBatch } from '@/lib/interestRateHistory';
import { getDisplayProductType } from '@/lib/productDisplay';
import { isExcludedSavingsBankSlug } from '@/lib/comparisonCatalog';
import { enrichOffersWithBonus } from '@/lib/offerBonus';
import {
  X,
  RefreshCw,
  SlidersHorizontal,
  Search,
  ArrowUpRight,
  LayoutGrid,
  Table2,
} from 'lucide-react';

const INVESTMENT_TYPES = ['Festgeld', 'Flexgeld', 'Tagesgeld'];
const PRODUCT_TYPE_TABS = ['Alle', ...INVESTMENT_TYPES];

const DEFAULT_FILTERS = {
  searchText: '',
  interestRateRange: [0, 10],
  countries: [],
  investmentAmount: '',
  investmentTypes: [],
  termRange: [0, 120],
  interestFrequencies: [],
};

const getInvestmentType = (offer) =>
  offer.investment_type || (offer.deposit_term === 0 ? 'Tagesgeld' : 'Festgeld');

const getTermLabel = (offer) =>
  offer.deposit_term === 0 || getInvestmentType(offer) === 'Tagesgeld'
    ? 'Flexibel'
    : `${offer.deposit_term} Monate`;

const isFeaturedBank = (offer) => offer.bank_name.toLowerCase() === 'bbva bank deutschland';

const buildTopOfferIds = (offers) => {
  if (offers.length === 0) return new Set();
  const sorted = [...offers].map((o) => o.interest_rate).sort((a, b) => b - a);
  const threshold = sorted[Math.floor(offers.length * 0.1)] ?? sorted[0];
  return new Set(offers.filter((o) => o.interest_rate >= threshold).map((o) => o.id));
};

const countActiveFilters = (filters) => {
  let count = 0;
  if (filters.searchText.trim()) count++;
  if (filters.interestRateRange[0] > 0 || filters.interestRateRange[1] < 10) count++;
  if (filters.countries.length > 0) count++;
  if (filters.investmentAmount) count++;
  if (filters.investmentTypes.length > 0) count++;
  if (filters.termRange[0] > 0 || filters.termRange[1] < 120) count++;
  if (filters.interestFrequencies.length > 0) count++;
  return count;
};

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const FilterBadge = memo(({ label, onRemove }) => (
  <span className="inline-flex items-center gap-2 border border-bank-border bg-white px-3 py-1.5 text-[12px] font-medium text-bank-text shadow-editorial-sm">
    <span aria-hidden className="h-1 w-1 rounded-full bg-bank-gold" />
    {label}
    <button
      type="button"
      onClick={onRemove}
      className="text-bank-text-muted transition-colors hover:text-bank-primary"
      aria-label="Entfernen"
    >
      <X className="h-3 w-3" strokeWidth={LUCIDE_STROKE} />
    </button>
  </span>
));

const filterLabelClass =
  'mb-1.5 inline-flex items-center gap-2 text-[9px] font-medium uppercase tracking-[0.26em] text-bank-text-muted';

const filterSliderClass =
  '[&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:border-2 [&>span:first-child]:h-1.5';

const CheckboxGroup = memo(({ label, options, selected, onChange, renderLabel, listClassName }) => (
  <div>
    <p className={filterLabelClass}>
      <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-bank-gold" />
      {label}
    </p>
    <div className={listClassName ?? 'space-y-1.5'}>
      {options.map((opt) => (
        <label
          key={opt}
          className="flex min-w-0 cursor-pointer select-none items-center gap-2.5 text-[12.5px] leading-snug text-bank-text transition-colors hover:text-bank-primary"
        >
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => onChange(opt)}
            className="h-3.5 w-3.5 shrink-0 rounded-sm border-bank-border text-bank-primary focus:ring-bank-accent/40 focus:ring-offset-0"
          />
          <span>{renderLabel ? renderLabel(opt) : opt}</span>
        </label>
      ))}
    </div>
  </div>
));

const FilterPanel = memo(
  ({
    filters,
    availableCountries,
    availableFrequencies,
    activeFilterCount,
    onSearchChange,
    onSliderChange,
    onAmountChange,
    onToggleArray,
    onReset,
  }) => (
    <div className="space-y-5">
      <div>
        <p className={filterLabelClass}>
          <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-bank-gold" />
          Suche
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-bank-text-muted" strokeWidth={LUCIDE_STROKE} />
          <Input
            value={filters.searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Bank oder Land"
            className="h-9 rounded-none border-bank-border bg-bank-bg pl-9 text-[13px] focus-visible:ring-bank-accent/40"
          />
          {filters.searchText && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-bank-text-muted hover:text-bank-primary"
              aria-label="Suche leeren"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <p className={filterLabelClass + ' mb-0'}>
            <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-bank-gold" />
            Zinssatz
          </p>
          <span className="rate-figure text-sm tabular-nums text-bank-text" data-numeric>
            {filters.interestRateRange[0]}–{filters.interestRateRange[1]}
            <span className="ml-0.5 font-mono text-[9px] text-bank-gold">%</span>
          </span>
        </div>
        <Slider
          className={filterSliderClass}
          min={0}
          max={10}
          step={0.1}
          value={filters.interestRateRange}
          onValueChange={(v) => onSliderChange('interestRateRange', v)}
        />
        <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-bank-text-muted">
          <span>0 %</span>
          <span>10 %</span>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <p className={filterLabelClass + ' mb-0'}>
            <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-bank-gold" />
            Laufzeit
          </p>
          <span className="rate-figure text-sm tabular-nums text-bank-text" data-numeric>
            {filters.termRange[0]}–{filters.termRange[1]}
            <span className="ml-0.5 font-mono text-[9px] text-bank-gold">M</span>
          </span>
        </div>
        <Slider
          className={filterSliderClass}
          min={0}
          max={120}
          step={1}
          value={filters.termRange}
          onValueChange={(v) => onSliderChange('termRange', v)}
        />
        <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-bank-text-muted">
          <span>Flexibel</span>
          <span>120</span>
        </div>
      </div>

      <div>
        <p className={filterLabelClass}>
          <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-bank-gold" />
          Anlagebetrag (€)
        </p>
        <Input
          type="number"
          value={filters.investmentAmount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="z. B. 10.000"
          className="h-9 rounded-none border-bank-border bg-bank-bg text-[13px] focus-visible:ring-bank-accent/40"
          min="0"
        />
        <p className="mt-1 text-[10.5px] leading-snug text-bank-text-muted">
          Nur Angebote mit passender Mindesteinlage.
        </p>
      </div>

      {availableCountries.length > 0 && (
        <CheckboxGroup
          label="Land"
          options={availableCountries}
          selected={filters.countries}
          onChange={(v) => onToggleArray('countries', v)}
          listClassName="grid grid-cols-2 gap-x-2 gap-y-1.5"
          renderLabel={(c) => (
            <CountryFlagIcon
              country={c}
              size="xs"
              showLabel
              className="min-w-0"
              labelClassName="truncate text-[12px] text-bank-text"
            />
          )}
        />
      )}

      <CheckboxGroup
        label="Anlagetyp"
        options={INVESTMENT_TYPES}
        selected={filters.investmentTypes}
        onChange={(v) => onToggleArray('investmentTypes', v)}
      />

      {availableFrequencies.length > 0 && (
        <CheckboxGroup
          label="Zinsauszahlung"
          options={availableFrequencies}
          selected={filters.interestFrequencies}
          onChange={(v) => onToggleArray('interestFrequencies', v)}
        />
      )}

      {activeFilterCount > 0 && (
        <Button
          variant="outline-ink"
          size="sm"
          className="h-9 w-full rounded-none text-[11px]"
          onClick={onReset}
        >
          <X className="mr-1.5 h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} />
          Zurücksetzen
        </Button>
      )}
    </div>
  )
);

const SavingsComparison = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [interestOffer, setInterestOffer] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState('cards');

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState('interest_rate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [reviewStatsMap, setReviewStatsMap] = useState(() => new Map());
  const [rateHistoryMap, setRateHistoryMap] = useState(() => new Map());

  const debouncedSearchText = useDebouncedValue(filters.searchText, 300);

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    const typeParam = searchParams.get('types') || searchParams.get('product');
    if (!typeParam) return;
    const match = INVESTMENT_TYPES.find(
      (t) => t.toLowerCase() === typeParam.trim().toLowerCase(),
    );
    if (match) {
      setFilters((prev) => ({ ...prev, investmentTypes: [match] }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) fetchFavorites();
    else setFavorites([]);
  }, [user]);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('savings_offers')
        .select(
          '*, banks(id, name, slug, country, logo_url, website_url, deposit_protection, deposit_protection_amount, founded_year, credit_rating, regulator_name)'
        )
        .eq('is_active', true);
      if (error) throw error;
      const mapped = (data || [])
        .map((o) => ({
          ...o,
          bank_name: o.banks?.name || '',
          bank_slug: o.banks?.slug || '',
          country: o.banks?.country || '',
          bank_logo: o.banks?.logo_url || null,
          website_url: o.banks?.website_url || null,
          deposit_protection: o.banks?.deposit_protection || o.deposit_protection || '',
          deposit_protection_amount: o.banks?.deposit_protection_amount || o.deposit_protection || '',
          founded_year: o.banks?.founded_year ?? null,
          credit_rating: o.banks?.credit_rating ?? null,
          regulator_name: o.banks?.regulator_name ?? o.deposit_protection_authority ?? null,
        }))
        .filter((o) => !isExcludedSavingsBankSlug(o.bank_slug));
      setOffers(enrichOffersWithBonus(mapped));
      const ids = mapped.map((o) => o.id);
      if (ids.length > 0) {
        const [{ map }, historyMap] = await Promise.all([
          fetchOfferReviewStatsBatch(ids),
          fetchInterestRateHistoryBatch(ids),
        ]);
        setReviewStatsMap(map);
        setRateHistoryMap(historyMap);
      } else {
        setReviewStatsMap(new Map());
        setRateHistoryMap(new Map());
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('SavingsComparison fetchOffers', err);
      const msg = String(err?.message || err || '');
      const network =
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('fetch') ||
        msg.includes('timeout') ||
        msg.includes('TIMED_OUT') ||
        err?.name === 'TypeError';
      toast.error(
        network
          ? 'Keine Verbindung zum Daten-Server (Supabase). Bitte Netzwerk/VPN prüfen und die Seite neu laden.'
          : 'Fehler beim Laden der Angebote'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('favorites')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      setFavorites(data?.favorites || []);
    } catch {
      console.error('Fehler beim Laden der Favoriten');
    }
  };

  const handleSearchChange = useCallback((value) => setFilters((prev) => ({ ...prev, searchText: value })), []);

  const handleSliderChange = useCallback((key, value) => setFilters((prev) => ({ ...prev, [key]: value })), []);

  const handleAmountChange = useCallback((value) => setFilters((prev) => ({ ...prev, investmentAmount: value })), []);

  const toggleArrayFilter = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value],
    }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const setProductTypeFilter = useCallback((tab) => {
    setFilters((prev) => ({
      ...prev,
      investmentTypes: tab === 'Alle' ? [] : [tab],
    }));
  }, []);

  const activeProductTab = useMemo(() => {
    if (filters.investmentTypes.length === 0) return 'Alle';
    if (filters.investmentTypes.length === 1) return filters.investmentTypes[0];
    return null;
  }, [filters.investmentTypes]);

  const toggleSortOrder = useCallback(() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc')), []);

  const toggleFavorite = useCallback(
    async (e, offerId) => {
      e.stopPropagation();
      if (!user) {
        toast.error('Bitte melden Sie sich an, um Favoriten zu speichern');
        return;
      }
      setFavorites((prev) => {
        const wasFav = prev.includes(offerId);
        const next = wasFav ? prev.filter((id) => id !== offerId) : [...prev, offerId];

        supabase
          .from('profiles')
          .update({ favorites: next })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) {
              toast.error('Fehler beim Aktualisieren der Favoriten');
              setFavorites(prev);
            } else {
              logEvent(wasFav ? EVENTS.FAVORITE_REMOVE : EVENTS.FAVORITE_ADD, { offer_id: offerId });
            }
          });

        toast.success(wasFav ? 'Aus Favoriten entfernt' : 'Zu Favoriten hinzugefügt');
        return next;
      });
    },
    [user]
  );

  const handleOpenDetail = useCallback((offer) => {
    setSelectedOffer(offer);
    setShowDetailModal(true);
  }, []);

  const handleOpenInterest = useCallback((offer) => {
    setInterestOffer(offer);
    setShowInterestModal(true);
  }, []);

  const handleCloseDetail = useCallback(() => setShowDetailModal(false), []);
  const handleCloseInterest = useCallback(() => setShowInterestModal(false), []);

  const topOfferIds = useMemo(() => buildTopOfferIds(offers), [offers]);

  const availableCountries = useMemo(
    () => [...new Set(offers.map((o) => o.country))].filter(Boolean).sort(),
    [offers]
  );

  const availableFrequencies = useMemo(
    () => [...new Set(offers.map((o) => o.interest_frequency).filter(Boolean))],
    [offers]
  );

  const filteredOffers = useMemo(() => {
    let result = [...offers];

    if (debouncedSearchText.trim()) {
      const q = debouncedSearchText.toLowerCase();
      result = result.filter(
        (o) => o.bank_name.toLowerCase().includes(q) || o.country.toLowerCase().includes(q)
      );
    }

    result = result.filter(
      (o) => o.interest_rate >= filters.interestRateRange[0] && o.interest_rate <= filters.interestRateRange[1]
    );

    if (filters.countries.length > 0) result = result.filter((o) => filters.countries.includes(o.country));

    if (filters.investmentTypes.length > 0)
      result = result.filter((o) => filters.investmentTypes.includes(getDisplayProductType(o)));

    if (filters.investmentAmount) {
      const amount = parseFloat(filters.investmentAmount.replace(/\./g, '').replace(',', '.'));
      if (!isNaN(amount)) result = result.filter((o) => (o.min_deposit ?? 0) <= amount);
    }

    result = result.filter(
      (o) => o.deposit_term >= filters.termRange[0] && o.deposit_term <= filters.termRange[1]
    );

    if (filters.interestFrequencies.length > 0)
      result = result.filter((o) => filters.interestFrequencies.includes(o.interest_frequency));

    result.sort((a, b) => {
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    const featured = result.filter(isFeaturedBank);
    const rest = result.filter((o) => !isFeaturedBank(o));
    return [...featured, ...rest];
  }, [offers, debouncedSearchText, filters, sortBy, sortOrder]);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.searchText.trim())
      chips.push({
        key: 'searchText',
        label: `„${filters.searchText}“`,
        onRemove: () => handleSearchChange(''),
      });
    if (filters.interestRateRange[0] > 0 || filters.interestRateRange[1] < 10)
      chips.push({
        key: 'rate',
        label: `${filters.interestRateRange[0]}% – ${filters.interestRateRange[1]}%`,
        onRemove: () => handleSliderChange('interestRateRange', [0, 10]),
      });
    if (filters.termRange[0] > 0 || filters.termRange[1] < 120)
      chips.push({
        key: 'term',
        label: `${filters.termRange[0]}–${filters.termRange[1]} Mon.`,
        onRemove: () => handleSliderChange('termRange', [0, 120]),
      });
    filters.countries.forEach((c) =>
      chips.push({
        key: `country-${c}`,
        label: getCountryLabelDe(c) || c,
        onRemove: () => toggleArrayFilter('countries', c),
      })
    );
    filters.investmentTypes.forEach((t) =>
      chips.push({
        key: `type-${t}`,
        label: t,
        onRemove: () => toggleArrayFilter('investmentTypes', t),
      })
    );
    filters.interestFrequencies.forEach((f) =>
      chips.push({ key: `freq-${f}`, label: f, onRemove: () => toggleArrayFilter('interestFrequencies', f) })
    );
    if (filters.investmentAmount)
      chips.push({
        key: 'amount',
        label: `€ ${filters.investmentAmount}`,
        onRemove: () => handleAmountChange(''),
      });
    return chips;
  }, [filters, handleSearchChange, handleSliderChange, handleAmountChange, toggleArrayFilter]);

  const filterPanelProps = useMemo(
    () => ({
      filters,
      availableCountries,
      availableFrequencies,
      activeFilterCount,
      onSearchChange: handleSearchChange,
      onSliderChange: handleSliderChange,
      onAmountChange: handleAmountChange,
      onToggleArray: toggleArrayFilter,
      onReset: resetFilters,
    }),
    [
      filters,
      availableCountries,
      availableFrequencies,
      activeFilterCount,
      handleSearchChange,
      handleSliderChange,
      handleAmountChange,
      toggleArrayFilter,
      resetFilters,
    ]
  );

  const getOfferBadge = useCallback(
    (offer) => {
      if (isFeaturedBank(offer)) return { text: 'Hervorgehoben', tone: 'gold' };
      if (topOfferIds.has(offer.id)) return { text: 'Top-Kondition', tone: 'emerald' };
      return null;
    },
    [topOfferIds]
  );

  const spotlightOffers = useMemo(() => filteredOffers.slice(0, 3), [filteredOffers]);

  return (
    <div className="min-h-screen bg-bank-bg">
      <PageMeta
        title="Festgeld, Tagesgeld & Flexgeld Vergleich"
        description="Vergleichen Sie aktuelle Festgeld-, Tagesgeld- und Flexgeldangebote europäischer Partnerbanken nach Zinssatz, Laufzeit, Mindesteinlage und Einlagensicherung."
        path="/comparison"
      />
      {/* Editorial hero — porcelain + brass rule */}
      <section className="relative isolate overflow-hidden border-b border-bank-border bg-bank-bg">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-mesh-soft opacity-80" />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 grain opacity-80" />
        <div className="relative mx-auto max-w-[1440px] px-5 pb-14 pt-10 sm:px-8 sm:pb-16 sm:pt-12 lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-x-12 lg:px-12 lg:pb-20 lg:pt-14">
          {/* Left: editorial composition */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.07 } } }}
            className="lg:col-span-7 lg:py-6"
          >
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="font-display max-w-[14ch] text-display-lg font-light leading-[0.98] tracking-[-0.015em] text-bank-text sm:text-display-xl"
            >
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
            </motion.h1>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mt-7 max-w-[36rem] text-[18px] leading-[1.6] text-bank-text sm:text-[19px]"
            >
              <span className="font-medium">Festgeld, Tagesgeld und flexible Modelle.</span>{' '}
              <span className="text-bank-text-muted">
                Vergleichen Sie Zinsen, Laufzeiten und Einlagensicherung regulierter EU-Partner auf
                einen Blick.
              </span>
            </motion.p>
          </motion.div>

          {/* Right: editorial photo card — taller for a more zoomed-out feel */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 lg:col-span-5 lg:mt-0"
          >
            <div className="relative isolate mx-auto h-full w-full max-w-[560px] overflow-hidden rounded-[28px] border border-bank-border bg-bank-surface shadow-editorial-lg lg:ml-auto lg:mr-0">
              <div className="relative aspect-[3/4] lg:h-full lg:aspect-auto">
                <img
                  src={siteImages.comparison.hero}
                  alt={siteImages.comparison.heroAlt}
                  className="absolute inset-0 h-full w-full object-cover object-[50%_30%]"
                  loading="eager"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 topo-pattern opacity-[0.05] mix-blend-soft-light"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/12 to-transparent"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:flex lg:items-start lg:gap-12 lg:px-12 lg:py-14">
        {/* Main column */}
        <div className="min-w-0 flex-1">
          {/* Session 80.37 — Market context strip: EZB + Top-Rates aus Live-API */}
          <MarketContextStrip />
          {/* Spotlight — editorial premium strip */}
          {!loading && spotlightOffers.length > 0 && (
            <div className="mb-12 grid gap-4 sm:grid-cols-3">
              {spotlightOffers.map((offer, i) => (
                <motion.button
                  key={offer.id}
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => handleOpenDetail(offer)}
                  className="group relative overflow-hidden border border-bank-border bg-white p-6 text-left transition-all duration-500 ease-editorial hover:-translate-y-0.5 hover:shadow-editorial-md"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity duration-500',
                      i === 0
                        ? 'bg-gradient-to-r from-bank-gold/30 via-bank-gold/70 to-bank-gold/30 opacity-100'
                        : 'bg-gradient-to-r from-transparent via-bank-gold/30 to-transparent opacity-50 group-hover:opacity-100'
                    )}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
                      {i === 0 ? '01 · Top-Zins' : `0${i + 1} · Platz ${i + 1}`}
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 text-bank-text-muted/35 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-bank-primary"
                      strokeWidth={LUCIDE_STROKE}
                    />
                  </div>
                  <p className="font-display mt-4 truncate text-xl font-normal text-bank-text">{offer.bank_name}</p>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="rate-figure text-display-md leading-none text-bank-primary" data-numeric>
                      {Number(offer.interest_rate ?? 0).toFixed(2).replace('.', ',')}
                    </span>
                    <span className="font-mono text-xs text-bank-gold">% p.a.</span>
                  </div>
                  <span aria-hidden className="mt-3 block h-px w-10 bg-bank-gold/45" />
                  <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
                    {getDisplayProductType(offer)} · {getTermLabel(offer)}
                  </p>
                </motion.button>
              ))}
            </div>
          )}

          {/* Toolbar — editorial */}
          <div className="mb-6 flex flex-col gap-4 border-y border-bank-border py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="inline-flex items-center gap-2 border border-bank-border bg-white px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.18em] text-bank-text transition-colors hover:border-bank-primary/35 hover:bg-bank-bg lg:hidden"
                onClick={() => setShowMobileFilters(true)}
              >
                <SlidersHorizontal className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                Kriterien
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-[1.25rem] items-center justify-center border border-bank-gold/55 bg-bank-gold/15 px-1 font-mono text-[10px] font-medium text-bank-gold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <p className="flex items-baseline gap-2 text-[13px] text-bank-text-muted">
                {loading ? (
                  'Lädt…'
                ) : (
                  <>
                    <span className="rate-figure text-2xl text-bank-primary" data-numeric>
                      {filteredOffers.length}
                    </span>
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.22em]">
                      Angebote
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
                    'inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35 focus-visible:ring-offset-1 focus-visible:ring-offset-white',
                    viewMode === 'table'
                      ? 'bg-bank-ink text-white'
                      : 'text-bank-text-muted hover:text-bank-text'
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
                    'inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35 focus-visible:ring-offset-1 focus-visible:ring-offset-white',
                    viewMode === 'cards'
                      ? 'bg-bank-ink text-white'
                      : 'text-bank-text-muted hover:text-bank-text'
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} />
                  Karten
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted sm:inline">
                  Sortieren ·
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-11 border border-bank-border bg-white px-3 text-sm text-bank-text focus:outline-none focus:ring-2 focus:ring-bank-accent/40"
                >
                  <option value="interest_rate">Zinssatz</option>
                  <option value="deposit_term">Laufzeit</option>
                  <option value="min_deposit">Mindesteinlage</option>
                </select>
                <button
                  type="button"
                  onClick={toggleSortOrder}
                  className="flex h-11 w-11 items-center justify-center border border-bank-border bg-white text-bank-text-muted transition-colors hover:border-bank-gold/45 hover:text-bank-gold"
                  title={sortOrder === 'desc' ? 'Absteigend' : 'Aufsteigend'}
                  aria-label={sortOrder === 'desc' ? 'Absteigend sortieren' : 'Aufsteigend sortieren'}
                >
                  <span aria-hidden className="font-mono text-base">
                    {sortOrder === 'desc' ? '↓' : '↑'}
                  </span>
                </button>
              </div>
            </div>
            </div>

            <div
              role="tablist"
              aria-label="Anlagetyp"
              className="flex flex-wrap gap-2"
            >
              {PRODUCT_TYPE_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeProductTab === tab}
                  onClick={() => setProductTypeFilter(tab)}
                  className={cn(
                    'inline-flex items-center px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors',
                    'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35 focus-visible:ring-offset-1',
                    activeProductTab === tab
                      ? 'border-bank-ink bg-bank-ink text-white'
                      : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/35 hover:text-bank-text'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <FilterBadge key={chip.key} label={chip.label} onRemove={chip.onRemove} />
              ))}
              {activeChips.length > 1 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="font-mono text-[11px] uppercase tracking-[0.18em] text-bank-gold underline-offset-4 hover:underline"
                >
                  · Alle löschen
                </button>
              )}
            </div>
          )}

          {loading && (
            <div className="border border-bank-border bg-white px-8 py-24 text-center shadow-editorial-sm">
              <RefreshCw className="mx-auto mb-5 h-8 w-8 animate-spin text-bank-primary" strokeWidth={LUCIDE_STROKE} />
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
                Angebote werden geladen…
              </p>
            </div>
          )}

          {!loading && filteredOffers.length === 0 && (
            <div className="border border-bank-border bg-white px-8 py-24 text-center shadow-editorial-sm">
              <SlidersHorizontal className="mx-auto mb-5 h-10 w-10 text-bank-text-muted/30" strokeWidth={LUCIDE_STROKE} />
              <p className="font-display text-display-sm font-light text-bank-text">Keine Angebote</p>
              <span aria-hidden className="mx-auto mt-4 block h-px w-12 bg-bank-gold/55" />
              <p className="mt-4 text-sm leading-relaxed text-bank-text-muted">
                Bitte Filter lockern oder zurücksetzen.
              </p>
              <div className="mt-8">
                <Button variant="outline-ink" size="lg" onClick={resetFilters}>
                  Filter zurücksetzen
                </Button>
              </div>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {!loading && filteredOffers.length > 0 && viewMode === 'cards' && (
              <motion.div
                key="cards"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {filteredOffers.map((offer) => (
                  <ComparisonOfferCard
                    key={offer.id}
                    offer={offer}
                    isFav={favorites.includes(offer.id)}
                    badge={getOfferBadge(offer)}
                    featured={isFeaturedBank(offer)}
                    rateHistory={rateHistoryMap.get(offer.id) || []}
                    onOpen={handleOpenDetail}
                    navigate={navigate}
                    onInterest={handleOpenInterest}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </motion.div>
            )}
            {!loading && filteredOffers.length > 0 && viewMode === 'table' && (
              <motion.div
                key="table"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ComparisonOfferTable
                  offers={filteredOffers}
                  favorites={favorites}
                  isFeaturedBank={isFeaturedBank}
                  onOpen={handleOpenDetail}
                  navigate={navigate}
                  onToggleFavorite={toggleFavorite}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Filters — right column desktop (no sticky: tall panels stay reachable via normal page scroll) */}
        <aside className="mt-12 hidden w-full shrink-0 border border-bank-border bg-white p-5 shadow-editorial-sm sm:p-6 lg:mt-0 lg:block lg:w-[300px] lg:shadow-editorial-md xl:w-[320px]">
          <span aria-hidden className="-mx-5 mb-4 block h-px w-[calc(100%+2.5rem)] bg-gradient-to-r from-transparent via-bank-gold/40 to-transparent sm:-mx-6 sm:w-[calc(100%+3rem)] sm:mb-4" />
          <div className="mb-5 flex items-center justify-between border-b border-bank-border pb-4">
            <div className="flex items-center gap-2">
              <Eyebrow>Kriterien</Eyebrow>
            </div>
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-[1.5rem] items-center justify-center border border-bank-gold/55 bg-bank-gold/15 px-1.5 font-mono text-[10px] text-bank-gold">
                {activeFilterCount}
              </span>
            )}
          </div>
          <FilterPanel {...filterPanelProps} />
        </aside>
      </div>

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
              transition={{ type: 'tween', duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 right-0 z-[150] flex w-full max-w-md flex-col border-l border-bank-border bg-white shadow-editorial-lg lg:hidden"
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/55 to-transparent" />
              <div className="flex items-center justify-between border-b border-bank-border px-6 py-5">
                <Eyebrow>Kriterien</Eyebrow>
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(false)}
                  className="flex h-10 w-10 items-center justify-center text-bank-text-muted transition-colors hover:bg-bank-bg hover:text-bank-primary"
                  aria-label="Filter schließen"
                >
                  <X className="h-5 w-5" strokeWidth={LUCIDE_STROKE} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-8">
                <FilterPanel {...filterPanelProps} />
              </div>
              <div className="border-t border-bank-border bg-bank-bg p-6">
                <Button
                  variant="primary"
                  size="xl"
                  className="w-full"
                  onClick={() => setShowMobileFilters(false)}
                >
                  {filteredOffers.length} Angebot{filteredOffers.length !== 1 ? 'e' : ''} anzeigen
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {selectedOffer && (
        <OfferDetailModal
          offer={selectedOffer}
          rateHistory={rateHistoryMap.get(selectedOffer.id) || []}
          isOpen={showDetailModal}
          onClose={handleCloseDetail}
          onInterestClick={(offer) => {
            handleCloseDetail();
            handleOpenInterest(offer);
          }}
          onApply={(offer) => navigate('/apply', { state: { offer } })}
        />
      )}

      {interestOffer && (
        <OfferInterestModal offer={interestOffer} isOpen={showInterestModal} onClose={handleCloseInterest} />
      )}
    </div>
  );
};

export default SavingsComparison;
