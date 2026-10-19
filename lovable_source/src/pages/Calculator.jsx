import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Euro,
  Calendar,
  Percent,
  ArrowUpRight,
  FileCheck2,
  TrendingUp,
  Shield,
  Info,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import PageMeta from '@/components/PageMeta';
import SectionLabel from '@/components/editorial/SectionLabel';
import Eyebrow from '@/components/editorial/Eyebrow';
import TocSticky from '@/components/editorial/TocSticky';
import SavingsGrowthChart from '@/components/calculator/SavingsGrowthChart';
import useSavingsOfferStats from '@/hooks/useSavingsOfferStats';
import { formatRateDe } from '@/lib/interestRateHistory';
import {
  ABGELTUNG_TAX_RATE,
  applyWithholdingTax,
  buildProjectionSeries,
  calcInterest,
  DEFAULT_SAVER_ALLOWANCE,
} from '@/lib/savingsInterestCalc';
import {
  CALCULATOR_FAQ,
  CALCULATOR_TOC,
  INTEREST_MODES,
  PRODUCT_TYPES,
  RATE_PRESETS,
} from '@/data/calculatorPageContent';

const EASE = [0.22, 1, 0.36, 1];

function parseInitialFromParams(searchParams) {
  const amount = Number(searchParams.get('amount') || searchParams.get('betrag'));
  const months = Number(searchParams.get('months') || searchParams.get('laufzeit'));
  const rate = Number(searchParams.get('rate') || searchParams.get('zins'));
  const product = searchParams.get('product') || searchParams.get('typ');
  const productMatch = PRODUCT_TYPES.find(
    (p) => p.id.toLowerCase() === String(product || '').toLowerCase() || p.slug === product,
  );
  return {
    amount: Number.isFinite(amount) && amount > 0 ? amount : 10000,
    termMonths: Number.isFinite(months) && months > 0 ? months : null,
    interestRate: Number.isFinite(rate) && rate > 0 ? rate : null,
    productType: productMatch?.id ?? 'Festgeld',
  };
}

export default function Calculator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefersReduced = useReducedMotion();
  const initial = useMemo(() => parseInitialFromParams(searchParams), [searchParams]);

  const initialProduct =
    PRODUCT_TYPES.find((p) => p.id === initial.productType) ?? PRODUCT_TYPES[0];

  const [productType, setProductType] = useState(initialProduct.id);
  const [amount, setAmount] = useState(initial.amount);
  const [termMonths, setTermMonths] = useState(
    initial.termMonths ?? initialProduct.defaultMonths,
  );
  const [interestRate, setInterestRate] = useState(initial.interestRate ?? 3.0);
  const [interestMode, setInterestMode] = useState(initialProduct.defaultMode);
  const [showTax, setShowTax] = useState(false);
  const [taxAllowance, setTaxAllowance] = useState(DEFAULT_SAVER_ALLOWANCE);
  const { stats: offerStats, loading: ratesLoading } = useSavingsOfferStats();
  const marketRates = useMemo(
    () => ({
      Festgeld: offerStats.Festgeld?.maxRate ?? null,
      Flexgeld: offerStats.Flexgeld?.maxRate ?? null,
      Tagesgeld: offerStats.Tagesgeld?.maxRate ?? null,
    }),
    [offerStats],
  );

  const activeProduct = PRODUCT_TYPES.find((p) => p.id === productType) ?? PRODUCT_TYPES[0];

  const handleProductChange = useCallback((typeId) => {
    const next = PRODUCT_TYPES.find((p) => p.id === typeId);
    if (!next) return;
    setProductType(typeId);
    setInterestMode(next.defaultMode);
  }, []);

  const applyMarketRate = useCallback(() => {
    const top = marketRates[productType];
    if (top != null && top > 0) setInterestRate(Math.round(top * 100) / 100);
  }, [marketRates, productType]);

  const results = useMemo(() => {
    const { interest, final } = calcInterest({
      principal: amount,
      annualRatePercent: interestRate,
      months: termMonths,
      mode: interestMode,
    });
    const taxResult = showTax
      ? applyWithholdingTax({ grossInterest: interest, allowance: taxAllowance })
      : null;
    const series = buildProjectionSeries({
      principal: amount,
      annualRatePercent: interestRate,
      months: termMonths,
      mode: interestMode,
      tax: showTax
        ? { enabled: true, allowance: taxAllowance, taxRate: ABGELTUNG_TAX_RATE }
        : undefined,
    });
    return {
      grossInterest: interest,
      finalAmount: final,
      tax: taxResult?.tax ?? 0,
      netInterest: taxResult?.netInterest ?? interest,
      netFinal: taxResult ? amount + taxResult.netInterest : final,
      series,
    };
  }, [amount, termMonths, interestRate, interestMode, showTax, taxAllowance]);

  const comparisonHref = `/comparison?types=${encodeURIComponent(productType)}`;

  const handleApply = () => {
    navigate('/apply', {
      state: {
        prefill: {
          investment_amount: amount,
          term_months: termMonths,
          interest_rate: interestRate,
          investment_type: productType,
          source: 'calculator',
        },
      },
    });
  };

  const formatAmount = (value) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatTerm = (months) => {
    if (months < 12) return `${months} ${months === 1 ? 'Monat' : 'Monate'}`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years} ${years === 1 ? 'Jahr' : 'Jahre'}`;
    return `${years} ${years === 1 ? 'Jahr' : 'Jahre'} ${remainingMonths} ${remainingMonths === 1 ? 'Monat' : 'Monate'}`;
  };

  const quickAmounts = [5000, 10000, 25000, 50000, 100000];
  const quickTerms = [
    { label: '3 M.', value: 3 },
    { label: '6 M.', value: 6 },
    { label: '1 J.', value: 12 },
    { label: '2 J.', value: 24 },
    { label: '3 J.', value: 36 },
    { label: '5 J.', value: 60 },
  ];

  const fieldHeader = 'mb-5 flex items-center justify-between gap-4';
  const fieldLabel =
    'inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.28em] text-bank-text-muted';

  const topMarketRate = marketRates[productType];
  const reveal = (i = 0) => ({
    initial: { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-40px' },
    transition: { duration: prefersReduced ? 0 : 0.55, ease: EASE, delay: prefersReduced ? 0 : 0.04 * i },
  });

  return (
    <div className="min-h-screen bg-bank-bg">
      <PageMeta
        title="Zinsrechner für Sparanlagen"
        description="Festgeld, Flexgeld und Tagesgeld: Zinsertrag berechnen, Steuern einkalkulieren und passende Angebote im Vergleich finden."
        path="/calculator"
      />

      <section className="relative isolate overflow-hidden border-b border-bank-border bg-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-mesh-soft opacity-80" />
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:flex lg:items-end lg:justify-between lg:gap-12 lg:px-12">
          <SectionLabel
            eyebrow="Werkzeuge · Zinsrechner"
            title={
              <>
                Zinsen kalkulieren —{' '}
                <span className="italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
                  brutto & netto.
                </span>
              </>
            }
            lede="Anlagebetrag, Laufzeit und Zinssatz anpassen. Optional Steuern und Zinseszins — danach direkt passende Angebote vergleichen."
            size="lg"
          />
          <Link to={comparisonHref} className="mt-8 inline-flex shrink-0 lg:mt-0">
            <Button variant="outline-ink" size="lg">
              Zum Sparvergleich
              <ArrowUpRight className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
            </Button>
          </Link>
        </div>
      </section>

      <section id="rechner" className="scroll-mt-24">
        <div className="mx-auto grid max-w-[1440px] lg:min-h-[calc(100vh-10rem)] lg:grid-cols-[1.05fr_1fr]">
          <div className="border-b border-bank-border bg-bank-bg px-5 py-12 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-16">
            <div className="mx-auto max-w-lg space-y-10">
              {/* Produkt */}
              <div>
                <p className={fieldLabel}>Produkt</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PRODUCT_TYPES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleProductChange(p.id)}
                      className={cn(
                        'border px-3 py-2 text-[12px] font-medium transition-colors',
                        productType === p.id
                          ? 'border-bank-ink bg-bank-ink text-white'
                          : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-gold/55',
                      )}
                      data-testid={`calc-product-${p.slug}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-bank-text-muted">{activeProduct.hint}</p>
              </div>

              <span aria-hidden className="block h-px w-16 bg-bank-gold/45" />

              {/* Anlagebetrag */}
              <div>
                <div className={fieldHeader}>
                  <label className={fieldLabel} htmlFor="calc-amount">
                    <Euro className="h-3.5 w-3.5 text-bank-gold" strokeWidth={LUCIDE_STROKE} />
                    Anlagebetrag
                  </label>
                  <div className="relative">
                    <Input
                      id="calc-amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="rate-figure h-12 w-40 rounded-none border-bank-border bg-white pr-9 text-right text-2xl text-bank-text focus-visible:ring-bank-accent/40"
                      data-testid="calc-amount-input"
                      data-numeric
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm text-bank-gold">
                      €
                    </span>
                  </div>
                </div>
                <Slider
                  value={[amount]}
                  onValueChange={(value) => setAmount(value[0])}
                  min={1000}
                  max={500000}
                  step={1000}
                  data-testid="calc-amount-slider"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {quickAmounts.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={cn(
                        'border px-3 py-2 text-[12px] font-medium transition-colors',
                        amount === val
                          ? 'border-bank-ink bg-bank-ink text-white'
                          : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-gold/55',
                      )}
                    >
                      {formatAmount(val)}
                    </button>
                  ))}
                </div>
              </div>

              <span aria-hidden className="block h-px w-16 bg-bank-gold/45" />

              {/* Laufzeit */}
              <div>
                <div className={fieldHeader}>
                  <span className={fieldLabel}>
                    <Calendar className="h-3.5 w-3.5 text-bank-gold" strokeWidth={LUCIDE_STROKE} />
                    Anlagedauer
                  </span>
                  <span className="font-display text-xl font-normal text-bank-text">{formatTerm(termMonths)}</span>
                </div>
                <Slider
                  value={[termMonths]}
                  onValueChange={(value) => setTermMonths(value[0])}
                  min={1}
                  max={120}
                  step={1}
                  data-testid="calc-term-slider"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {quickTerms.map((term) => (
                    <button
                      key={term.value}
                      type="button"
                      onClick={() => setTermMonths(term.value)}
                      className={cn(
                        'border px-3 py-2 text-[12px] font-medium transition-colors',
                        termMonths === term.value
                          ? 'border-bank-ink bg-bank-ink text-white'
                          : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-gold/55',
                      )}
                    >
                      {term.label}
                    </button>
                  ))}
                </div>
              </div>

              <span aria-hidden className="block h-px w-16 bg-bank-gold/45" />

              {/* Zinssatz */}
              <div>
                <div className={fieldHeader}>
                  <label className={fieldLabel} htmlFor="calc-rate">
                    <Percent className="h-3.5 w-3.5 text-bank-gold" strokeWidth={LUCIDE_STROKE} />
                    Zinssatz p.a.
                  </label>
                  <div className="relative">
                    <Input
                      id="calc-rate"
                      type="number"
                      step="0.01"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="rate-figure h-12 w-32 rounded-none border-bank-border bg-white pr-9 text-right text-2xl text-bank-text focus-visible:ring-bank-accent/40"
                      data-testid="calc-rate-input"
                      data-numeric
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm text-bank-gold">
                      %
                    </span>
                  </div>
                </div>
                <Slider
                  value={[interestRate * 10]}
                  onValueChange={(value) => setInterestRate(value[0] / 10)}
                  min={0}
                  max={100}
                  step={1}
                  data-testid="calc-rate-slider"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {RATE_PRESETS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setInterestRate(r)}
                      className={cn(
                        'border px-3 py-2 text-[12px] font-medium tabular-nums transition-colors',
                        interestRate === r
                          ? 'border-bank-ink bg-bank-ink text-white'
                          : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-gold/55',
                      )}
                      data-numeric
                    >
                      {r.toFixed(2).replace('.', ',')} %
                    </button>
                  ))}
                  {topMarketRate != null && topMarketRate > 0 && (
                    <button
                      type="button"
                      onClick={applyMarketRate}
                      className="inline-flex items-center gap-1 border border-bank-primary/30 bg-bank-primary/5 px-3 py-2 text-[12px] font-medium text-bank-primary hover:bg-bank-primary/10"
                      data-testid="calc-apply-market-rate"
                    >
                      <Sparkles className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} />
                      Top {topMarketRate.toFixed(2).replace('.', ',')} %
                    </button>
                  )}
                </div>
              </div>

              <span aria-hidden className="block h-px w-16 bg-bank-gold/45" />

              {/* Verzinsung */}
              <div>
                <p className={fieldLabel}>Verzinsungsmodell</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {INTEREST_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setInterestMode(m.id)}
                      className={cn(
                        'border px-3 py-2 text-[12px] font-medium transition-colors',
                        interestMode === m.id
                          ? 'border-bank-ink bg-bank-ink text-white'
                          : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-gold/55',
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Steuern */}
              <div id="steuern" className="scroll-mt-32 rounded-xl border border-bank-border bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-bank-text">Nach Steuern anzeigen</p>
                    <p className="mt-1 text-xs text-bank-text-muted">
                      Abgeltungsteuer {((ABGELTUNG_TAX_RATE * 100).toFixed(3)).replace('.', ',')} % (ohne
                      Kirchensteuer)
                    </p>
                  </div>
                  <Switch checked={showTax} onCheckedChange={setShowTax} data-testid="calc-tax-toggle" />
                </div>
                {showTax && (
                  <div className="mt-4 border-t border-bank-border pt-4">
                    <label className="text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                      Freistellungsauftrag (€)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={2000}
                      value={taxAllowance}
                      onChange={(e) => setTaxAllowance(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="mt-2 h-10 w-full max-w-[200px] tabular-nums"
                      data-numeric
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results panel */}
          <div className="relative isolate flex flex-col justify-center overflow-hidden bg-bank-ink px-5 py-14 sm:px-10 lg:px-14 lg:py-16">
            <div aria-hidden className="absolute inset-0 -z-10 topo-pattern opacity-25 mix-blend-screen" />
            <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_80%_0%,rgba(108,167,224,0.15),transparent_60%)]" />

            <div className="relative mx-auto w-full max-w-xl">
              <Eyebrow tone="light">Projektion · {productType}</Eyebrow>

              <h2 className="font-display mt-5 max-w-lg text-display-md font-light leading-[1.05] text-white">
                Endbetrag nach{' '}
                <span className="italic text-bank-gold-soft">{formatTerm(termMonths)}</span>
              </h2>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">Endbetrag (brutto)</p>
                  <motion.p
                    key={results.finalAmount}
                    initial={prefersReduced ? false : { opacity: 0.5, y: 4 }}
                    animate={prefersReduced ? undefined : { opacity: 1, y: 0 }}
                    className="rate-figure mt-2 text-3xl leading-none text-white sm:text-4xl"
                    data-testid="calc-result-final"
                    data-numeric
                  >
                    {formatAmount(results.finalAmount)}
                  </motion.p>
                </div>
                <div className="border border-bank-gold/35 bg-bank-gold/[0.07] p-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-gold">Zinsertrag (brutto)</p>
                  <motion.p
                    key={results.grossInterest}
                    initial={prefersReduced ? false : { opacity: 0.5, y: 4 }}
                    animate={prefersReduced ? undefined : { opacity: 1, y: 0 }}
                    className="rate-figure mt-2 text-3xl leading-none text-white sm:text-4xl"
                    data-testid="calc-result-interest"
                    data-numeric
                  >
                    +{formatAmount(results.grossInterest)}
                  </motion.p>
                </div>
              </div>

              {showTax && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="border border-white/10 bg-white/[0.02] p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">Steuer (ca.)</p>
                    <p className="rate-figure mt-2 text-xl text-white/75" data-numeric>
                      −{formatAmount(results.tax)}
                    </p>
                  </div>
                  <div className="border border-emerald-500/30 bg-emerald-500/10 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-200/80">
                      Netto Zinsen / Endbetrag
                    </p>
                    <p className="rate-figure mt-2 text-xl text-white" data-numeric>
                      +{formatAmount(results.netInterest)} → {formatAmount(results.netFinal)}
                    </p>
                  </div>
                </div>
              )}

              <SavingsGrowthChart series={results.series} showNet={showTax} />

              <p className="mt-8 max-w-md text-sm leading-relaxed text-white/65">
                <strong className="text-white" data-numeric>
                  {formatAmount(amount)}
                </strong>{' '}
                · {formatTerm(termMonths)} ·{' '}
                <strong className="text-white" data-numeric>
                  {interestRate.toFixed(2).replace('.', ',')} % p.a.
                </strong>{' '}
                · {INTEREST_MODES.find((m) => m.id === interestMode)?.short}
                {showTax ? ' · inkl. Steuerabzug' : ''} (Orientierung, unverbindlich).
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline-accent"
                  size="xl"
                  onClick={handleApply}
                  data-testid="calc-cta-apply"
                >
                  <FileCheck2 className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                  Werte übernehmen
                </Button>
                <Link to={comparisonHref}>
                  <Button variant="ghost-dark" size="xl" className="w-full sm:w-auto">
                    Angebote vergleichen
                    <ArrowUpRight className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Below fold: TOC + market + FAQ */}
      <section className="border-t border-bank-border py-14 sm:py-20">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16 lg:px-12">
          <TocSticky items={CALCULATOR_TOC} className="top-28" />

          <div className="min-w-0 space-y-16">
            <motion.article {...reveal(0)} id="marktzinsen" className="scroll-mt-32">
              <header className="border-b border-bank-border pb-6">
                <h2 className="font-display text-2xl font-light text-bank-text">Aktuelle Top-Zinsen</h2>
                <p className="mt-2 text-sm text-bank-text-muted">
                  Höchste Zinssätze aus unserem aktiven Angebotsbestand — Stand live aus dem Vergleich.
                </p>
              </header>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {PRODUCT_TYPES.map((p) => {
                  const rate = marketRates[p.id];
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        'rounded-xl border p-5',
                        productType === p.id
                          ? 'border-bank-primary/40 bg-bank-primary/5'
                          : 'border-bank-border bg-white',
                      )}
                    >
                      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-bank-text-muted">
                        {p.label}
                      </p>
                      <p className="rate-figure mt-2 text-2xl font-light text-bank-primary" data-numeric>
                        {ratesLoading ? '…' : rate != null ? `${formatRateDe(rate)} %` : '—'}
                      </p>
                      <p className="mt-1 text-xs text-bank-text-muted">p.a. · aktiv im Vergleich</p>
                      <Link
                        to={`/comparison?types=${encodeURIComponent(p.id)}`}
                        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-bank-primary hover:underline"
                      >
                        Angebote
                        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </motion.article>

            <motion.article {...reveal(1)} id="vergleich" className="scroll-mt-32">
              <header className="border-b border-bank-border pb-6">
                <h2 className="font-display text-2xl font-light text-bank-text">Vergleich & Produktwissen</h2>
              </header>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Link
                  to={comparisonHref}
                  className="flex gap-4 rounded-xl border border-bank-border bg-white p-6 shadow-editorial-sm transition-colors hover:border-bank-primary/30"
                >
                  <TrendingUp className="h-8 w-8 shrink-0 text-bank-primary" strokeWidth={LUCIDE_STROKE} />
                  <div>
                    <p className="font-semibold text-bank-text">Sparvergleich</p>
                    <p className="mt-1 text-sm text-bank-text-muted">
                      Alle {productType}-Angebote mit Filtern nach Land, Laufzeit und Zinssatz.
                    </p>
                  </div>
                </Link>
                <Link
                  to={`/produkte/${activeProduct.slug}`}
                  className="flex gap-4 rounded-xl border border-bank-border bg-white p-6 shadow-editorial-sm transition-colors hover:border-bank-primary/30"
                >
                  <Info className="h-8 w-8 shrink-0 text-bank-primary" strokeWidth={LUCIDE_STROKE} />
                  <div>
                    <p className="font-semibold text-bank-text">{activeProduct.label} erklärt</p>
                    <p className="mt-1 text-sm text-bank-text-muted">
                      Definition, Einlagensicherung, Steuern und FAQ zum Produkt.
                    </p>
                  </div>
                </Link>
                <Link
                  to="/sicherheit-regulierung"
                  className="flex gap-4 rounded-xl border border-bank-border bg-white p-6 shadow-editorial-sm sm:col-span-2"
                >
                  <Shield className="h-8 w-8 shrink-0 text-bank-primary" strokeWidth={LUCIDE_STROKE} />
                  <div>
                    <p className="font-semibold text-bank-text">Einlagensicherung</p>
                    <p className="mt-1 text-sm text-bank-text-muted">
                      EU-Schutz bis 100.000 € pro Person und Bank — so ordnen wir Partnerbanken ein.
                    </p>
                  </div>
                </Link>
              </div>
            </motion.article>

            <motion.article {...reveal(2)} id="faq" className="scroll-mt-32">
              <header className="border-b border-bank-border pb-6">
                <h2 className="font-display text-2xl font-light text-bank-text">Häufige Fragen</h2>
              </header>
              <Accordion type="single" collapsible className="mt-6 rounded-2xl border border-bank-border bg-white px-2">
                {CALCULATOR_FAQ.map((item, i) => (
                  <AccordionItem key={item.q} value={`calc-faq-${i}`}>
                    <AccordionTrigger className="px-4 text-left font-medium text-bank-text hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 text-sm leading-relaxed text-bank-text-muted">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.article>

            <div className="rounded-2xl border border-bank-border bg-white p-8 shadow-editorial-sm">
              <Eyebrow>Hinweis</Eyebrow>
              <h3 className="font-display mt-4 text-xl font-light text-bank-text">Zur Berechnung</h3>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-bank-text-muted">
                Banken unterscheiden sich bei Zinsgutschrift (laufend, jährlich, am Ende),
                Mindestanlage und Neukundenaktionen. Kirchensteuer und individuelle Freistellungsaufträge können
                abweichen. Verbindliche Konditionen finden Sie im jeweiligen Angebot.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
