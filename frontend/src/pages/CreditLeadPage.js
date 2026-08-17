import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import siteImages from '@/data/siteImages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BankLogo from '@/components/BankLogo';
import { getOfferRatingValue } from '@/lib/offerRating';
import { toast } from 'sonner';
import { sanitizeFormField } from '@/lib/formInputSanitize';
import {
  ChevronDown,
  Check,
  Phone,
  Mail,
  Euro,
  CalendarDays,
  Briefcase,
  CheckCircle2,
  XCircle,
  Star,
  ArrowRight,
} from 'lucide-react';

const TERM_OPTIONS = [
  { label: '12 Monate', value: 12 },
  { label: '24 Monate', value: 24 },
  { label: '36 Monate', value: 36 },
  { label: '48 Monate', value: 48 },
  { label: '60 Monate', value: 60 },
  { label: '72 Monate', value: 72 },
  { label: '84 Monate', value: 84 },
  { label: '96 Monate', value: 96 },
  { label: '120 Monate', value: 120 },
  { label: '180 Monate', value: 180 },
  { label: '240 Monate', value: 240 },
];

const PURPOSE_OPTIONS = [
  'Freie Verwendung',
  'Umschuldung',
  'Auto',
  'Renovierung',
  'Möbel / Einrichtung',
  'Sonstiges',
];

const SORT_OPTIONS = [
  { value: 'effective_rate_asc', label: 'Niedrigster effektiver Jahreszins zuerst' },
  { value: 'monthly_rate_asc', label: 'Niedrigste monatliche Rate zuerst' },
  { value: 'rating_desc', label: 'Beste Bewertung zuerst' },
];

const GROUP_ORDER = ['Sicherheit', 'Flexibilitaet', 'Kundenfreundlichkeit'];
const SECTION_LABELS = {
  Sicherheit: 'Sicherheit',
  Flexibilitaet: 'Flexibilität',
  Kundenfreundlichkeit: 'Kundenfreundlichkeit',
};

const KREDIT_HERO_IMAGE_SRC =
  (typeof process !== 'undefined' && process.env.REACT_APP_KREDIT_HERO_IMAGE_URL) ||
  siteImages.credit.hero;

const CreditLeadPage = () => {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [filters, setFilters] = useState({
    requestedAmount: '20000',
    requestedTermMonths: 84,
    purpose: 'Freie Verwendung',
  });
  const [sortBy, setSortBy] = useState('effective_rate_asc');
  const [expandedOfferId, setExpandedOfferId] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ratingsByBankId, setRatingsByBankId] = useState({});
  const [hasCompared, setHasCompared] = useState(false);

  const calculateMonthlyRate = (principal, annualRatePercent, termMonths) => {
    const p = Number(principal || 0);
    const n = Number(termMonths || 0);
    const annualRate = Number(annualRatePercent || 0);
    if (!p || !n || !Number.isFinite(p) || !Number.isFinite(n)) return null;
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate <= 0) return p / n;
    const denominator = 1 - Math.pow(1 + monthlyRate, -n);
    if (denominator === 0) return null;
    return (p * monthlyRate) / denominator;
  };

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const [creditRes, savingsRes] = await Promise.all([
        supabase
          .from('credit_offers')
          .select(`
            *,
            banks(id, name, country, logo_url),
            credit_offer_product_information(*),
            credit_offer_acceptance_guidelines(*)
          `)
          .eq('is_active', true),
        supabase
          .from('savings_offers')
          .select('bank_id, interest_rate, banks(name)')
          .eq('is_active', true),
      ]);

      if (creditRes.error) throw creditRes.error;
      if (savingsRes.error) throw savingsRes.error;

      const savingsByBank = new Map();
      (savingsRes.data || []).forEach((item) => {
        if (!item.bank_id) return;
        const current = savingsByBank.get(item.bank_id);
        const nextRate = Number(item.interest_rate || 0);
        if (!current || nextRate > Number(current.interest_rate || 0)) {
          savingsByBank.set(item.bank_id, item);
        }
      });

      const ratings = {};
      savingsByBank.forEach((item, bankId) => {
        const syntheticOffer = {
          bank_name: item.banks?.name || '',
          interest_rate: Number(item.interest_rate || 0),
        };
        ratings[bankId] = getOfferRatingValue(syntheticOffer);
      });

      setRatingsByBankId(ratings);
      setOffers(creditRes.data || []);
    } catch {
      toast.error('Kredit-Angebote konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const amountPreview = useMemo(
    () => Number(filters.requestedAmount || 0).toLocaleString('de-DE'),
    [filters.requestedAmount],
  );

  const filteredOffers = useMemo(() => {
    const amount = Number(filters.requestedAmount || 0);
    const term = Number(filters.requestedTermMonths || 0);
    let result = offers.filter((offer) => {
      const amountOk =
        (!offer.min_amount_eur || amount >= Number(offer.min_amount_eur)) &&
        (!offer.max_amount_eur || amount <= Number(offer.max_amount_eur));
      const termOk =
        (!offer.min_term_months || term >= Number(offer.min_term_months)) &&
        (!offer.max_term_months || term <= Number(offer.max_term_months));
      const purposeOk =
        !filters.purpose ||
        offer.purpose === filters.purpose ||
        offer.purpose === 'Freie Verwendung';
      return amountOk && termOk && purposeOk;
    });

    if (sortBy === 'effective_rate_asc') {
      result = result.sort(
        (a, b) => Number(a.effective_rate_from || 0) - Number(b.effective_rate_from || 0),
      );
    } else if (sortBy === 'monthly_rate_asc') {
      result = result.sort(
        (a, b) => Number(a.monthly_rate_from || 0) - Number(b.monthly_rate_from || 0),
      );
    } else if (sortBy === 'rating_desc') {
      result = result.sort((a, b) => {
        const ratingA = Number(ratingsByBankId[a.bank_id] ?? a.rating_value ?? 0);
        const ratingB = Number(ratingsByBankId[b.bank_id] ?? b.rating_value ?? 0);
        return ratingB - ratingA;
      });
    }
    return result;
  }, [offers, filters, sortBy, ratingsByBankId]);

  const groupedProductInfo = (offer) => {
    const rows = [...(offer.credit_offer_product_information || [])].sort(
      (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0),
    );
    return GROUP_ORDER.map((section) => ({
      section,
      rows: rows.filter((row) => row.section === section),
    })).filter((group) => group.rows.length > 0);
  };

  const handleSubmitLead = async (e) => {
    e.preventDefault();
    if (!contactForm.email.trim() && !contactForm.phone.trim()) {
      toast.error('Bitte E-Mail oder Telefonnummer angeben.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        requested_amount: Number(filters.requestedAmount),
        requested_term_months: Number(filters.requestedTermMonths),
        purpose: filters.purpose,
        full_name: contactForm.fullName.trim() || null,
        email: contactForm.email.trim() || null,
        phone: contactForm.phone.trim() || null,
        credit_offer_id: selectedOffer?.id || null,
        bank_id: selectedOffer?.bank_id || null,
      };

      const { error } = await supabase.from('credit_leads').insert(payload);
      if (error) throw error;

      setSubmitted(true);
      toast.success('Anfrage erfolgreich gesendet.');
    } catch {
      toast.error('Anfrage konnte nicht gesendet werden.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompare = (e) => {
    e.preventDefault();
    setHasCompared(true);
    setExpandedOfferId(null);
    setTimeout(() => {
      const resultEl = document.getElementById('credit-results');
      if (resultEl) {
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  };

  const selectFieldClass =
    'h-11 w-full rounded-xl border border-bank-border bg-bank-surface px-3.5 text-sm text-bank-text shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors focus:border-bank-accent-strong/50 focus:outline-none focus:ring-2 focus:ring-bank-primary/25 dark:bg-bank-surface-elev';

  return (
    <div className="relative min-h-screen overflow-hidden bg-bank-bg">
      <div
        className="pointer-events-none absolute -left-32 top-0 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 40% 40%, rgb(var(--bank-accent) / 0.22), transparent 68%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-[420px] w-[480px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 60% 60%, rgb(var(--bank-gold) / 0.14), transparent 70%)',
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 grain opacity-[0.45]" aria-hidden />

      <section className="editorial-shell relative z-10 pb-20 pt-10 sm:pt-14">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-bank-border/90 bg-bank-surface shadow-editorial-lg">
          <div
            className="absolute inset-0 bg-gradient-to-br from-bank-surface via-bank-surface to-bank-surface-elev/80 dark:from-bank-surface dark:via-bank-surface dark:to-bank-surface-elev/40"
            aria-hidden
          />
          <div className="absolute -right-16 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-bank-primary/[0.06] blur-3xl dark:bg-bank-accent/[0.08]" aria-hidden />
          <div className="relative border-b border-bank-border/70 bg-bank-ink/[0.03] px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14 dark:bg-white/[0.02]">
            <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-7">
                <h1 className="text-pretty font-display text-display-md font-normal tracking-tight text-bank-text">
                  Kreditvergleich mit Partnerkonditionen
                </h1>
                <p className="mt-4 max-w-xl text-pretty font-sans text-base leading-relaxed text-bank-text-muted sm:text-[1.05rem]">
                  Vergleichen Sie verhandelte Konditionen unserer Partnerbanken und senden Sie Ihre
                  unverbindliche Kreditanfrage in einem transparenten, strukturierten Prozess.
                </p>
              </div>

              <div className="relative lg:col-span-5">
                <div className="relative overflow-hidden rounded-2xl border border-bank-border/80 bg-bank-surface shadow-editorial-md ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
                  <img
                    src={KREDIT_HERO_IMAGE_SRC}
                    alt="Fröhlich lachender Mann, zugewandt und positiv"
                    className="aspect-[4/3] h-auto w-full object-cover object-[50%_28%] sm:aspect-[5/4] sm:object-[50%_32%]"
                    loading="eager"
                    decoding="async"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="relative space-y-8 p-6 sm:p-8 lg:p-10">
            <form
              onSubmit={handleCompare}
              className="relative overflow-hidden rounded-2xl border border-bank-border bg-bank-bg/90 p-5 shadow-bank-card sm:p-6 dark:bg-bank-bg/60"
            >
              <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gradient-to-b from-bank-gold via-bank-gold/60 to-bank-accent/50" aria-hidden />
              <div className="relative pl-4 sm:pl-5">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="kicker text-bank-text-muted">Schritt 1</p>
                    <h2 className="mt-1 font-display text-xl font-normal tracking-tight text-bank-text sm:text-2xl">
                      Parameter festlegen
                    </h2>
                    <p className="mt-1 max-w-lg text-sm text-bank-text-muted">
                      Betrag, Laufzeit und Verwendungszweck bestimmen, welche Partnerangebote für Sie
                      in Frage kommen.
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-12 md:gap-5">
                  <div className="md:col-span-4">
                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-bank-text">
                      <Euro size={15} className="text-bank-primary" aria-hidden />
                      Kreditsumme
                    </label>
                    <Input
                      type="number"
                      min="1000"
                      step="100"
                      value={filters.requestedAmount}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, requestedAmount: e.target.value }))
                      }
                      className="h-11 rounded-xl border-bank-border"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-bank-text">
                      <CalendarDays size={15} className="text-bank-primary" aria-hidden />
                      Laufzeit
                    </label>
                    <select
                      value={filters.requestedTermMonths}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          requestedTermMonths: Number(e.target.value),
                        }))
                      }
                      className={selectFieldClass}
                    >
                      {TERM_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-bank-text">
                      <Briefcase size={15} className="text-bank-primary" aria-hidden />
                      Verwendungszweck
                    </label>
                    <select
                      value={filters.purpose}
                      onChange={(e) => setFilters((prev) => ({ ...prev, purpose: e.target.value }))}
                      className={selectFieldClass}
                    >
                      {PURPOSE_OPTIONS.map((purpose) => (
                        <option key={purpose} value={purpose}>
                          {purpose}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end md:col-span-2">
                    <Button
                      type="submit"
                      className="shine group h-11 w-full rounded-xl bg-bank-ink font-sans text-sm font-semibold text-bank-on-ink shadow-[0_2px_0_rgb(var(--bank-ink-soft))] transition-all hover:bg-bank-ink-hover hover:shadow-accent-glow"
                    >
                      <span className="flex w-full items-center justify-center gap-2">
                        Kredite vergleichen
                        <ArrowRight
                          size={18}
                          className="transition-transform duration-300 ease-editorial group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            </form>

            <div
              id="credit-results"
              className="flex flex-col gap-4 border-t border-bank-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="font-sans text-sm text-bank-text-muted">
                <span className="inline-flex items-center gap-2 rounded-full border border-bank-border bg-bank-surface px-3 py-1 text-bank-text shadow-editorial-sm dark:bg-bank-surface-elev">
                  <span className="tabular-nums font-semibold text-bank-primary dark:text-bank-accent">
                    {filteredOffers.length}
                  </span>
                  passende Angebote
                </span>
                <span className="mx-2 hidden text-bank-border sm:inline">·</span>
                <span className="mt-2 block sm:mt-0 sm:inline">
                  Basis:{' '}
                  <span className="font-medium tabular-nums text-bank-text" data-numeric>
                    {amountPreview} EUR
                  </span>
                </span>
              </p>
              <div className="flex items-center gap-2">
                <label htmlFor="credit-sort" className="sr-only">
                  Sortierung
                </label>
                <select
                  id="credit-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`${selectFieldClass} sm:max-w-xs sm:min-w-[280px]`}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-5">
              {!hasCompared ? (
                <div className="relative overflow-hidden rounded-2xl border border-dashed border-bank-gold/35 bg-bank-bg/60 px-6 py-14 text-center dark:bg-bank-bg/40">
                  <div className="pointer-events-none absolute inset-0 topo-pattern opacity-40 dark:opacity-25" aria-hidden />
                  <div className="relative mx-auto max-w-md">
                    <p className="font-display text-lg text-bank-text">Noch kein Vergleich</p>
                    <p className="mt-2 text-sm leading-relaxed text-bank-text-muted">
                      Wählen Sie Kreditsumme, Laufzeit und Verwendungszweck, dann starten Sie mit
                      &quot;Kredite vergleichen&quot;.
                    </p>
                  </div>
                </div>
              ) : null}
              {loading ? (
                <div className="rounded-2xl border border-bank-border bg-bank-surface-elev/50 px-6 py-14 text-center dark:bg-bank-surface-elev/30">
                  <div
                    className="mx-auto mb-4 h-9 w-9 animate-pulse rounded-full border-2 border-bank-border border-t-bank-primary dark:border-t-bank-accent"
                    aria-hidden
                  />
                  <p className="text-sm font-medium text-bank-text">Angebote werden geladen…</p>
                  <p className="mt-1 text-xs text-bank-text-muted">Einen Moment bitte.</p>
                </div>
              ) : hasCompared && filteredOffers.length === 0 ? (
                <div className="rounded-2xl border border-bank-border bg-bank-bg/80 px-6 py-14 text-center">
                  <p className="font-display text-lg text-bank-text">Keine Treffer</p>
                  <p className="mt-2 text-sm text-bank-text-muted">
                    Für diese Kombination wurde aktuell kein Angebot gefunden. Passen Sie Betrag
                    oder Laufzeit an.
                  </p>
                </div>
              ) : hasCompared ? (
                filteredOffers.map((offer) => {
                  const isOpen = expandedOfferId === offer.id;
                  const productGroups = groupedProductInfo(offer);
                  const guidelineRows = [...(offer.credit_offer_acceptance_guidelines || [])].sort(
                    (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0),
                  );
                  const monthlyRate = calculateMonthlyRate(
                    filters.requestedAmount,
                    offer.effective_rate_from,
                    filters.requestedTermMonths,
                  );
                  const displayRating = Number(
                    ratingsByBankId[offer.bank_id] ?? offer.rating_value ?? 0,
                  );
                  return (
                    <article
                      key={offer.id}
                      className="group relative overflow-hidden rounded-2xl border border-bank-border/85 bg-bank-surface shadow-bank-card transition-[border-color,box-shadow,transform] duration-500 ease-editorial hover:-translate-y-0.5 hover:border-bank-primary/30 hover:shadow-editorial-md dark:bg-bank-surface-elev/90"
                    >
                      <div
                        className="pointer-events-none absolute inset-y-3 left-0 w-1 rounded-full bg-gradient-to-b from-bank-gold via-bank-gold/55 to-bank-accent/45 opacity-90"
                        aria-hidden
                      />
                      <div className="grid gap-4 p-4 pl-5 md:grid-cols-12 md:p-5 md:pl-6">
                        <div className="md:col-span-3">
                          <div className="flex items-center gap-3">
                            <BankLogo
                              logo={offer.banks?.logo_url || null}
                              bankName={offer.banks?.name || 'Bank'}
                              size="md"
                            />
                            <div>
                              <p className="font-display text-lg font-medium text-bank-text">
                                {offer.banks?.name}
                              </p>
                              <p className="text-xs text-bank-text-muted">{offer.banks?.country}</p>
                            </div>
                          </div>
                          {displayRating ? (
                            <p className="mt-2 inline-flex items-center gap-1 text-sm text-bank-text-muted">
                              <Star size={13} className="fill-current text-bank-gold" />
                              {displayRating.toFixed(1).replace('.', ',')}/10
                            </p>
                          ) : null}
                        </div>

                        <div className="md:col-span-4">
                          <ul className="space-y-2 text-sm leading-snug text-bank-text-muted">
                            {(offer.features || []).slice(0, 3).map((feature) => (
                              <li key={feature} className="flex items-start gap-2.5">
                                <Check
                                  size={15}
                                  className="mt-0.5 shrink-0 text-bank-success"
                                  strokeWidth={2.5}
                                />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="grid gap-2.5 md:col-span-3 md:grid-cols-2">
                          <div className="rounded-xl border border-bank-border/60 bg-bank-bg/80 px-3 py-2.5 text-center dark:bg-bank-bg/40">
                            <p className="font-display text-xl font-medium tabular-nums text-bank-text">
                              {filters.requestedTermMonths} Monate
                            </p>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-bank-text-muted">
                              Laufzeit
                            </p>
                          </div>
                          <div className="rounded-xl border border-bank-border/60 bg-bank-bg/80 px-3 py-2.5 text-center dark:bg-bank-bg/40">
                            <p className="font-display text-xl font-medium tabular-nums text-bank-text">
                              ab {Number(offer.effective_rate_from || 0).toFixed(2).replace('.', ',')}%
                            </p>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-bank-text-muted">
                              eff. Jahreszins
                            </p>
                          </div>
                        </div>

                        <div className="md:col-span-2 md:border-l md:border-bank-border/70 md:pl-5">
                          <p
                            className="rate-figure text-4xl font-normal leading-none tracking-tight text-bank-text"
                            data-numeric
                          >
                            {monthlyRate
                              ? `ab ${Number(monthlyRate).toLocaleString('de-DE', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                              : '-'}
                          </p>
                          <p className="mt-1 text-sm text-bank-text-muted">EUR monatlich</p>
                          <Button
                            onClick={() => {
                              setSelectedOffer(offer);
                              setShowLeadForm(true);
                              setSubmitted(false);
                            }}
                            className="shine mt-3.5 w-full rounded-xl bg-bank-ink font-sans text-sm font-semibold text-bank-on-ink shadow-[0_2px_0_rgb(var(--bank-ink-soft))] transition-all hover:bg-bank-ink-hover hover:shadow-brass-glow"
                          >
                            Kredit anfragen
                          </Button>
                        </div>
                      </div>

                      <div className="border-t border-bank-border/70 bg-bank-bg/40 px-4 py-2.5 md:px-6 dark:bg-bank-bg/25">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-sm font-medium text-bank-text-muted transition-colors hover:bg-bank-surface hover:text-bank-text"
                          onClick={() =>
                            setExpandedOfferId((prev) => (prev === offer.id ? null : offer.id))
                          }
                        >
                          Tarifdetails
                          <ChevronDown
                            size={15}
                            className={`transition-transform duration-300 ease-editorial ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>

                      {isOpen && (
                        <div className="border-t border-bank-border/70 bg-gradient-to-b from-bank-bg/70 to-bank-surface/30 p-4 md:p-6 dark:from-bank-bg/50 dark:to-bank-surface/20">
                          <div className="grid gap-6 lg:grid-cols-2">
                            <div>
                              <h3 className="kicker mb-3 text-bank-text-muted">
                                Produktinformationen
                              </h3>
                              <div className="mb-3 rounded-xl border border-bank-border/60 bg-bank-surface px-3 py-2.5 text-xs text-bank-text-muted">
                                Berechnungsbasis:{' '}
                                {Number(filters.requestedAmount || 0).toLocaleString('de-DE')} EUR,{' '}
                                {filters.requestedTermMonths} Monate, effektiver Jahreszins ab{' '}
                                {Number(offer.effective_rate_from || 0).toFixed(2).replace('.', ',')}%
                              </div>
                            {productGroups.length === 0 ? (
                              <p className="text-sm text-bank-text-muted">
                                Keine Produktinformationen vorhanden.
                              </p>
                            ) : (
                              <div className="space-y-4">
                                {productGroups.map((group) => (
                                  <div key={group.section}>
                                    <p className="mb-2 text-sm font-semibold text-bank-text">
                                      {SECTION_LABELS[group.section] || group.section}
                                    </p>
                                    <div className="space-y-2">
                                      {group.rows.map((row) => (
                                        <div
                                          key={row.id}
                                          className="rounded-xl border border-bank-border/50 bg-bank-surface px-3 py-2 text-sm"
                                        >
                                          <p className="flex items-start gap-2 text-bank-text">
                                            {row.is_positive ? (
                                              <CheckCircle2 size={14} className="mt-0.5 text-bank-success" />
                                            ) : (
                                              <XCircle size={14} className="mt-0.5 text-bank-error" />
                                            )}
                                            <span>{row.item_label}</span>
                                          </p>
                                          {row.item_description ? (
                                            <p className="ml-6 mt-1 text-xs text-bank-text-muted">
                                              {row.item_description}
                                            </p>
                                          ) : null}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <h3 className="kicker mb-3 text-bank-text-muted">Annahmerichtlinien</h3>
                            {guidelineRows.length === 0 ? (
                              <p className="text-sm text-bank-text-muted">
                                Keine Annahmerichtlinien vorhanden.
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {guidelineRows.map((item) => (
                                  <li
                                    key={item.id}
                                    className="rounded-xl border border-bank-border/50 bg-bank-surface px-3 py-2 text-sm text-bank-text"
                                  >
                                    {item.guideline_text}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            ) : null}
          </div>

          {showLeadForm && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-bank-ink/50 p-4 backdrop-blur-md">
              <div
                className="relative w-full max-w-2xl overflow-hidden rounded-[1.35rem] border border-bank-border/90 bg-bank-surface p-6 shadow-editorial-lg sm:p-8"
                role="dialog"
                aria-modal="true"
                aria-labelledby="credit-lead-dialog-title"
              >
                <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-bank-accent/12 blur-3xl" aria-hidden />
                {!submitted ? (
                  <>
                    <div className="relative mb-6 flex items-start justify-between gap-4">
                      <div>
                        <p className="kicker text-bank-text-muted">Kapitalmitte</p>
                        <h2
                          id="credit-lead-dialog-title"
                          className="mt-2 font-display text-2xl font-normal tracking-tight text-bank-text sm:text-[1.65rem]"
                        >
                          Kreditanfrage senden
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-bank-text-muted">
                          {selectedOffer?.banks?.name} ·{' '}
                          <span className="tabular-nums font-medium text-bank-text" data-numeric>
                            {amountPreview} EUR
                          </span>{' '}
                          · {filters.requestedTermMonths} Monate
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowLeadForm(false)}
                        className="shrink-0 rounded-full border border-bank-border bg-bank-bg/80 px-3 py-1.5 text-sm font-medium text-bank-text-muted transition-colors hover:border-bank-text/20 hover:bg-bank-surface-elev hover:text-bank-text"
                      >
                        Schliessen
                      </button>
                    </div>

                    <form onSubmit={handleSubmitLead} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-sm font-medium text-bank-text-muted">
                            Name (optional)
                          </label>
                          <Input
                            value={contactForm.fullName}
                            onChange={(e) =>
                              setContactForm((prev) => ({ ...prev, fullName: e.target.value }))
                            }
                            placeholder="Ihr Name"
                          />
                        </div>
                        <div>
                          <label className="mb-1 flex items-center gap-2 text-sm font-medium text-bank-text-muted">
                            <Mail size={14} /> E-Mail
                          </label>
                          <Input
                            type="email"
                            value={contactForm.email}
                            onChange={(e) =>
                              setContactForm((prev) => ({ ...prev, email: e.target.value }))
                            }
                            placeholder="name@email.de"
                          />
                        </div>
                        <div>
                          <label className="mb-1 flex items-center gap-2 text-sm font-medium text-bank-text-muted">
                            <Phone size={14} /> Telefon
                          </label>
                          <Input
                            type="tel"
                            value={contactForm.phone}
                            onChange={(e) =>
                              setContactForm((prev) => ({
                                ...prev,
                                phone: sanitizeFormField('phone', e.target.value),
                              }))
                            }
                            placeholder="+49 ..."
                          />
                        </div>
                      </div>
                      <p className="text-xs text-bank-text-muted">
                        Mindestens eine Kontaktmöglichkeit ist erforderlich: E-Mail oder Telefon.
                      </p>
                      <p className="text-xs text-bank-text-muted">
                        Mit dem Absenden erklären Sie sich mit der Kontaktaufnahme zur Bearbeitung
                        dieser Anfrage einverstanden.
                      </p>
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setShowLeadForm(false)}>
                          Abbrechen
                        </Button>
                        <Button
                          type="submit"
                          disabled={submitting}
                          className="bg-bank-ink text-white hover:bg-bank-ink-hover"
                        >
                          {submitting ? 'Wird gesendet...' : 'Anfrage senden'}
                        </Button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="rounded-xl border border-bank-success/25 bg-bank-success/10 p-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 text-bank-success" size={20} />
                      <div>
                        <p className="font-semibold text-bank-success">
                          Vielen Dank, Ihre Anfrage ist eingegangen.
                        </p>
                        <p className="mt-1 text-sm text-bank-text-muted">
                          Unser Team meldet sich in der Regel innerhalb eines Werktages bei Ihnen.
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 text-right">
                      <Button
                        onClick={() => setShowLeadForm(false)}
                        className="bg-bank-ink text-white hover:bg-bank-ink-hover"
                      >
                        Schliessen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default CreditLeadPage;
