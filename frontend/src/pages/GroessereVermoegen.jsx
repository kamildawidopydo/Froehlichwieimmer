import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowRight,
  Wallet,
  LineChart,
  ShieldCheck,
  Landmark,
  Users,
  Compass,
  Sparkles,
  Scale,
  Check,
} from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import { Button } from '@/components/ui/button';
import VermoegensStrukturSimulator from '@/components/groessere-vermoegen/VermoegensStrukturSimulator';

/**
 * Session 80.85 · Premium-Bereich „Größere Vermögen" — Phase 1
 * ------------------------------------------------------------------
 * Editorial Private-Banking-Aufbau ohne neue APIs, ohne neue
 * Finanzprodukte, ohne automatische Kaufempfehlung. Wiederverwendet
 * bestehende Routen (/comparison, /aktien, /news, /contact, /wissen,
 * /leistungen, /philosophie).
 */

const LUCIDE_STROKE = 1.5;

const VERMOEGEN_BUCKETS = [
  { value: 100000, label: '100.000 €' },
  { value: 250000, label: '250.000 €' },
  { value: 500000, label: '500.000 €' },
  { value: 1000000, label: '1.000.000 €' },
  { value: 2000000, label: '2.000.000 €+' },
];

const HORIZONT_OPTIONS = [
  { value: 'unter-3', label: 'unter 3 Jahre' },
  { value: '3-5', label: '3 – 5 Jahre' },
  { value: '5-10', label: '5 – 10 Jahre' },
  { value: 'ueber-10', label: 'über 10 Jahre' },
];

const LIQUIDITAET_OPTIONS = [
  { value: 'hoch', label: 'Hoch' },
  { value: 'mittel', label: 'Mittel' },
  { value: 'gering', label: 'Gering' },
];

const RISIKO_OPTIONS = [
  { value: 'defensiv', label: 'Defensiv' },
  { value: 'ausgewogen', label: 'Ausgewogen' },
  { value: 'chancenorientiert', label: 'Chancenorientiert' },
];

const ZIEL_OPTIONS = [
  { value: 'kapitalerhalt', label: 'Kapital erhalten' },
  { value: 'ertraege', label: 'Laufende Erträge' },
  { value: 'aufbau', label: 'Vermögen langfristig aufbauen' },
  { value: 'liquiditaet', label: 'Liquidität verfügbar halten' },
  { value: 'diversifikation', label: 'Vermögen diversifizieren' },
];

const ZIELGRUPPEN = [
  { title: 'Vermögende Privatkunden', body: 'Menschen, die einen wesentlichen Teil ihres Vermögens strukturiert betrachten und langfristig begleiten lassen möchten.' },
  { title: 'Unternehmerinnen und Unternehmer', body: 'Für Anleger, deren privates Vermögen sich vom operativen Geschäft trennen und eigenständig strukturieren lässt.' },
  { title: 'Familienvermögen', body: 'Vermögen, das über mehrere Generationen betrachtet wird — mit unterschiedlichen Zeit­horizonten, Bedürfnissen und Beteiligten.' },
  { title: 'Anleger mit größerer Liquidität', body: 'Für Situationen, in denen eine substantielle Liquiditätsreserve strukturiert verzinst und im Gesamtvermögen eingeordnet werden soll.' },
];

const LEISTUNGEN = [
  {
    id: 'vermoegens-check',
    n: '01',
    icon: Compass,
    eyebrow: 'Vermögens-Check',
    title: 'Das Gesamtvermögen im Blick',
    body: 'Bestehende Anlagen, verfügbare Liquidität, Anlagehorizont, persönliche Ziele und Risikostruktur werden gemeinsam betrachtet — nicht isoliert Produkt für Produkt, sondern als Zusammenspiel.',
    ctaLabel: 'Vermögen analysieren',
    ctaHref: '#vermoegen-strukturieren',
    ctaAnchor: true,
  },
  {
    id: 'zins-liquiditaet',
    n: '02',
    icon: Wallet,
    eyebrow: 'Zins- & Liquiditätsstrategie',
    title: 'Liquidität intelligent strukturieren',
    body: 'Verschiedene Laufzeiten, verfügbare Reserven und aktuelle Zinsangebote werden zu einer nachvollziehbaren Struktur zusammengeführt. Einlagensicherung wird immer institutsspezifisch und transparent dargestellt — pauschale Zusicherungen für große Gesamtbeträge geben wir bewusst nicht.',
    ctaLabel: 'Zum Zinsvergleich',
    ctaHref: '/comparison',
  },
  {
    id: 'kapitalmarkt',
    n: '03',
    icon: LineChart,
    eyebrow: 'Wertpapiere & Kapitalmarkt',
    title: 'Langfristige Chancen am Kapitalmarkt',
    body: 'Aktien, Fonds und ausgewählte Anlageprodukte werden mit Markt- und Unternehmensinformationen, Analysten­einschätzungen und Vergleichs­funktionen verbunden — als Grundlage für ein informiertes Gespräch.',
    ctaLabel: 'Zu den Aktien',
    ctaHref: '/aktien',
  },
  {
    id: 'portfolio-check',
    n: '04',
    icon: Scale,
    eyebrow: 'Portfolio-Check',
    title: 'Risiken und Konzentrationen erkennen',
    body: 'Bestehende Vergleichs-, Risiko- und Drawdown-Kennzahlen helfen, Diversifikation, Branchen- und Regionenverteilung sowie Volatilität einzuordnen. Wir treffen dabei bewusst keine automatischen Kauf- oder Verkaufsurteile.',
    ctaLabel: 'Aktien vergleichen',
    ctaHref: '/aktien',
  },
  {
    id: 'persoenlich',
    n: '05',
    icon: Users,
    eyebrow: 'Persönliche Beratung',
    title: 'Digital analysieren. Persönlich entscheiden.',
    body: 'Digitale Tools schaffen Transparenz und Orientierung. Bei größeren Vermögen ergänzt das persönliche Gespräch die individuelle Situation, die Ziele und den Zeithorizont — ohne Zeit- oder Produktdruck.',
    ctaLabel: 'Persönliches Vermögensgespräch',
    ctaHref: '/contact',
  },
];

const VERTRAUEN = [
  { icon: Sparkles, eyebrow: 'Transparenz', title: 'Nachvollziehbare Informationen', body: 'Klare Darstellung von Chancen, Kosten und Risiken — statt unnötiger Komplexität oder verkürzter Werbeaussagen.' },
  { icon: Landmark, eyebrow: 'Gesamtblick', title: 'Rolle im Gesamtvermögen', body: 'Einzelne Produkte werden nicht isoliert betrachtet, sondern in ihrer Funktion für Liquidität, Erträge, Diversifikation und langfristige Ziele.' },
  { icon: ShieldCheck, eyebrow: 'Persönlichkeit', title: 'Digital wo hilfreich, persönlich wo entscheidend', body: 'Digitale Orientierung dort, wo sie schneller und klarer ist. Persönliche Beratung dort, wo individuelle Entscheidungen gefragt sind.' },
];

/** Kleine Utility für Betrags-Formatierung. */
const formatEuro = (v) => {
  if (v == null || Number.isNaN(v)) return '';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
};

/** Ableitet passende Themen — NEUTRAL, keine Prozent-Allokation. */
function deriveRelevantThemes({ betrag, horizont, liquiditaet, risiko, ziele }) {
  const themes = new Set();

  // Liquiditätsreserve — bei hohem Liquiditätsbedarf oder kurzem Horizont oder Ziel „Liquidität verfügbar halten"
  if (liquiditaet === 'hoch' || horizont === 'unter-3' || ziele.includes('liquiditaet')) {
    themes.add('liquiditaets-reserve');
  }
  // Zins- und Laufzeitenstruktur — bei defensiver Neigung, gemischtem Horizont oder Ziel „laufende Erträge" / „Kapital erhalten"
  if (risiko === 'defensiv' || ziele.includes('ertraege') || ziele.includes('kapitalerhalt') || horizont === '3-5') {
    themes.add('zins-struktur');
  }
  // Wertpapieranlage — bei längerem Horizont oder Ziel „Vermögen langfristig aufbauen"
  if (horizont === '5-10' || horizont === 'ueber-10' || ziele.includes('aufbau') || risiko === 'chancenorientiert') {
    themes.add('wertpapieranlage');
  }
  // Diversifikation — bei größerem Betrag, Ziel „Vermögen diversifizieren", oder ausgewogenem Risiko
  if ((betrag && betrag >= 500000) || ziele.includes('diversifikation') || risiko === 'ausgewogen') {
    themes.add('diversifikation');
  }
  // Portfolio-Analyse — bei größerem Betrag oder chancenorientierter Ausrichtung
  if ((betrag && betrag >= 250000) || risiko === 'chancenorientiert') {
    themes.add('portfolio-analyse');
  }
  // Persönliche Beratung — immer sichtbar (kein Auto-Advice, sondern Einordnung)
  themes.add('persoenliche-beratung');

  return Array.from(themes);
}

const THEME_META = {
  'liquiditaets-reserve':  { title: 'Liquiditätsreserve', body: 'Kurzfristig verfügbare Mittel bewusst planen — als eigener Baustein neben verzinslichen und wertpapierbasierten Anlagen.', href: '/comparison', ctaLabel: 'Verzinsungen ansehen' },
  'zins-struktur':         { title: 'Zins- und Laufzeitenstruktur', body: 'Unterschiedliche Laufzeiten und Zinsangebote gezielt kombinieren — mit institutsspezifischer Betrachtung der Einlagensicherung.', href: '/comparison', ctaLabel: 'Zinsangebote vergleichen' },
  'wertpapieranlage':      { title: 'Wertpapieranlage', body: 'Aktien, Fonds und ausgewählte Anlageprodukte als möglicher Bestandteil langfristiger Vermögensstrukturen — mit klarem Bewusstsein für Chancen und Risiken.', href: '/aktien', ctaLabel: 'Zu den Aktien' },
  'diversifikation':       { title: 'Diversifikation', body: 'Verteilung über Anlageklassen, Regionen und Zeit — als eigenständiger Baustein für ein widerstandsfähigeres Gesamtvermögen.', href: '/wissen', ctaLabel: 'Wissenscenter öffnen' },
  'portfolio-analyse':     { title: 'Portfolioanalyse', body: 'Volatilität, Drawdown, Konzentrationen und Sektor-/Regionen­verteilung nachvollziehbar einordnen — ohne automatische Kauf- oder Verkaufs­urteile.', href: '/aktien', ctaLabel: 'Vergleich & Risiko öffnen' },
  'persoenliche-beratung': { title: 'Persönliche Beratung', body: 'Ein persönliches Vermögens­gespräch ordnet Ihre individuellen Ziele, Ihre Situation und Ihren Zeit­horizont ein — ohne Zeit- und Produktdruck.', href: '/contact', ctaLabel: 'Gespräch vereinbaren' },
};

const RISIKO_HINT = 'Kapitalmarktanlagen unterliegen Kursschwankungen und können bis hin zum Totalverlust führen. Zinsen können sich ändern. Einlagen­sicherungs­grenzen gelten institutsspezifisch. Diese Seite ist keine individuelle Anlage­beratung im Sinne des WpHG.';

export default function GroessereVermoegen() {
  const [betragMode, setBetragMode] = useState('quick'); // 'quick' | 'custom'
  const [betragQuick, setBetragQuick] = useState(500000);
  const [betragCustom, setBetragCustom] = useState('');
  const [horizont, setHorizont] = useState('5-10');
  const [liquiditaet, setLiquiditaet] = useState('mittel');
  const [risiko, setRisiko] = useState('ausgewogen');
  const [ziele, setZiele] = useState(['kapitalerhalt', 'ertraege']);
  const [submitted, setSubmitted] = useState(false);

  const currentBetrag = useMemo(() => {
    if (betragMode === 'quick') return betragQuick;
    const parsed = Number((betragCustom || '').toString().replace(/[^\d]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [betragMode, betragQuick, betragCustom]);

  const canSubmit = currentBetrag && currentBetrag >= 100000 && ziele.length > 0;

  const toggleZiel = (val) =>
    setZiele((prev) => (prev.includes(val) ? prev.filter((z) => z !== val) : [...prev, val]));

  const relevantThemes = useMemo(() => {
    if (!submitted || !currentBetrag) return [];
    return deriveRelevantThemes({
      betrag: currentBetrag,
      horizont,
      liquiditaet,
      risiko,
      ziele,
    });
  }, [submitted, currentBetrag, horizont, liquiditaet, risiko, ziele]);

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-clip bg-bank-bg text-bank-text" data-testid="groessere-vermoegen-page">
      <PageMeta
        title="Größere Vermögen · Individuelle Lösungen"
        description="EssenceInvest für größere Anlagevermögen: Liquidität, verzinsliche Anlagen, Wertpapiere, Diversifikation und persönliche Beratung im Zusammenspiel."
        path="/groessere-vermoegen"
      />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden border-b border-bank-border bg-bank-ink text-white"
        aria-labelledby="gv-hero-title"
      >
        <div className="topo-pattern absolute inset-0 opacity-[0.055]" aria-hidden />
        <div className="relative mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-gold">
            Größere Vermögen · Editorial
          </p>
          <h1
            id="gv-hero-title"
            className="mt-6 max-w-4xl font-display text-display-md font-light leading-[1.02] tracking-[-0.02em] sm:text-display-lg lg:text-display-xl"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
          >
            Vermögen braucht mehr <br className="hidden sm:block" />
            als <span className="text-bank-gold">einzelne&nbsp;Produkte</span>.
          </h1>
          <p className="mt-8 max-w-2xl text-[15px] leading-[1.85] text-white/85 sm:text-[16.5px]">
            Bei größeren Anlagevermögen betrachten wir nicht nur einzelne Angebote, sondern das
            Zusammenspiel von Liquidität, verzinslichen Anlagen, Wertpapieren, Laufzeiten und
            persönlichen Zielen.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              to="/contact"
              data-testid="gv-hero-primary-cta"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-bank-primary px-7 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-bank-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-ink"
            >
              Vermögensgespräch vereinbaren
              <ArrowRight size={16} strokeWidth={1.8} aria-hidden />
            </Link>
            <a
              href="#vermoegen-strukturieren"
              data-testid="gv-hero-secondary-cta"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-3 text-[14px] font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-ink"
            >
              Vermögen strukturieren
              <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden />
            </a>
          </div>
        </div>
      </section>

      {/* ── ZIELGRUPPEN ─────────────────────────────────────────────── */}
      <section className="border-b border-bank-border py-16 sm:py-20" aria-labelledby="gv-zielgruppen-title">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <Eyebrow>Für wen dieser Bereich gedacht ist</Eyebrow>
          <h2
            id="gv-zielgruppen-title"
            className="mt-5 max-w-3xl font-display text-[clamp(1.55rem,3.2vw+0.6rem,2.35rem)] font-light leading-[1.1] tracking-[-0.02em] text-bank-text"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
          >
            Wenn Vermögen einen eigenen Rahmen bekommt.
          </h2>
          <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-12">
            {ZIELGRUPPEN.map((z, i) => (
              <div key={z.title} data-testid={`gv-zielgruppe-${i + 1}`} className="flex flex-col">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
                  {String(i + 1).padStart(2, '0')} — Zielgruppe
                </p>
                <h3 className="mt-4 font-display text-[1.35rem] font-light leading-snug tracking-[-0.01em] text-bank-text">
                  {z.title}
                </h3>
                <p className="mt-3 text-[14.5px] leading-[1.8] text-bank-text-muted">{z.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FÜNF LEISTUNGSBEREICHE ──────────────────────────────────── */}
      <section className="border-b border-bank-border bg-bank-surface-elev/40 py-16 sm:py-24" aria-labelledby="gv-leistungen-title">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <Eyebrow>Leistungsbereiche</Eyebrow>
          <h2
            id="gv-leistungen-title"
            className="mt-5 max-w-3xl font-display text-[clamp(1.55rem,3.2vw+0.6rem,2.35rem)] font-light leading-[1.1] tracking-[-0.02em] text-bank-text"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
          >
            Fünf Bereiche, ein Zusammenspiel.
          </h2>

          <div className="mt-12 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-14 lg:gap-y-16">
            {LEISTUNGEN.map((l) => {
              const Icon = l.icon;
              return (
                <article key={l.id} data-testid={`gv-leistung-${l.id}`} className="group flex flex-col">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
                      {l.n} — {l.eyebrow}
                    </span>
                    <span className="h-px flex-1 bg-bank-border" aria-hidden />
                    <Icon className="h-5 w-5 shrink-0 text-bank-primary" strokeWidth={LUCIDE_STROKE} aria-hidden />
                  </div>
                  <h3
                    className="mt-5 font-display text-[1.5rem] font-light leading-tight tracking-[-0.015em] text-bank-text sm:text-[1.65rem]"
                    style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                  >
                    {l.title}
                  </h3>
                  <p className="mt-4 flex-1 text-[15px] leading-[1.75] text-bank-text-muted">{l.body}</p>
                  {l.ctaAnchor ? (
                    <a
                      href={l.ctaHref}
                      data-testid={`gv-leistung-${l.id}-cta`}
                      className="mt-6 inline-flex min-h-[44px] items-center gap-2 self-start text-[13.5px] font-semibold text-bank-primary transition-colors hover:text-bank-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2 rounded"
                    >
                      <span className="border-b border-transparent transition-colors group-hover:border-bank-primary/50">
                        {l.ctaLabel}
                      </span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.6} aria-hidden />
                    </a>
                  ) : (
                    <Link
                      to={l.ctaHref}
                      data-testid={`gv-leistung-${l.id}-cta`}
                      className="mt-6 inline-flex min-h-[44px] items-center gap-2 self-start text-[13.5px] font-semibold text-bank-primary transition-colors hover:text-bank-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2 rounded"
                    >
                      <span className="border-b border-transparent transition-colors group-hover:border-bank-primary/50">
                        {l.ctaLabel}
                      </span>
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.6} aria-hidden />
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TOOL: VERMÖGEN STRUKTURIEREN ────────────────────────────── */}
      <section
        id="vermoegen-strukturieren"
        className="border-b border-bank-border py-16 sm:py-24"
        aria-labelledby="gv-tool-title"
      >
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <Eyebrow>Vermögen strukturieren</Eyebrow>
          <h2
            id="gv-tool-title"
            className="mt-5 max-w-3xl font-display text-[clamp(1.55rem,3.2vw+0.6rem,2.35rem)] font-light leading-[1.1] tracking-[-0.02em] text-bank-text"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
          >
            Ihre Ausgangssituation — ohne pauschale Empfehlung.
          </h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-[1.8] text-bank-text-muted">
            Diese Eingabemaske erzeugt <strong>keine</strong> konkrete Kauf- oder Verkaufs­empfehlung.
            Sie strukturiert Ihre Angaben und zeigt, welche <em>Themen</em> im Rahmen eines
            persönlichen Vermögens­gesprächs relevant werden könnten.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); if (canSubmit) setSubmitted(true); }}
            className="mt-12 grid gap-10 lg:grid-cols-[3fr_2fr] lg:gap-14"
            data-testid="gv-tool-form"
          >
            {/* --- Eingaben --- */}
            <div className="space-y-10">
              {/* Anlagevermögen */}
              <fieldset>
                <legend className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
                  01 — Anlagevermögen
                </legend>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {VERMOEGEN_BUCKETS.map((b) => (
                    <button
                      type="button"
                      key={b.value}
                      onClick={() => { setBetragMode('quick'); setBetragQuick(b.value); }}
                      data-testid={`gv-betrag-quick-${b.value}`}
                      aria-pressed={betragMode === 'quick' && betragQuick === b.value}
                      className={[
                        'inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2',
                        betragMode === 'quick' && betragQuick === b.value
                          ? 'border-bank-primary bg-bank-primary text-white'
                          : 'border-bank-border bg-white text-bank-text hover:border-bank-primary/50',
                      ].join(' ')}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
                <div className="mt-5">
                  <label htmlFor="gv-betrag-custom" className="block font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-text-muted">
                    Freier Betrag (optional)
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      id="gv-betrag-custom"
                      type="text"
                      inputMode="numeric"
                      placeholder="z. B. 750.000"
                      value={betragCustom}
                      onFocus={() => setBetragMode('custom')}
                      onChange={(e) => { setBetragMode('custom'); setBetragCustom(e.target.value.replace(/[^\d.]/g, '')); }}
                      data-testid="gv-betrag-custom-input"
                      className="w-full min-h-[48px] rounded-md border border-bank-border bg-white px-4 py-2 text-[15px] font-medium text-bank-text placeholder:text-bank-text-soft focus:border-bank-primary focus:outline-none focus:ring-2 focus:ring-bank-primary/20 sm:w-64"
                    />
                    <span className="text-[14px] font-medium text-bank-text-muted">€</span>
                  </div>
                  <p className="mt-2 text-[12.5px] text-bank-text-soft">
                    Für die Auswertung sind Beträge ab 100.000 € vorgesehen.
                  </p>
                </div>
              </fieldset>

              {/* Anlagehorizont */}
              <fieldset>
                <legend className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
                  02 — Anlagehorizont
                </legend>
                <div className="mt-4 flex flex-wrap gap-3">
                  {HORIZONT_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setHorizont(o.value)}
                      aria-pressed={horizont === o.value}
                      data-testid={`gv-horizont-${o.value}`}
                      className={[
                        'inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2',
                        horizont === o.value
                          ? 'border-bank-primary bg-bank-primary text-white'
                          : 'border-bank-border bg-white text-bank-text hover:border-bank-primary/50',
                      ].join(' ')}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Liquiditätsbedarf */}
              <fieldset>
                <legend className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
                  03 — Liquiditätsbedarf
                </legend>
                <div className="mt-4 flex flex-wrap gap-3">
                  {LIQUIDITAET_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setLiquiditaet(o.value)}
                      aria-pressed={liquiditaet === o.value}
                      data-testid={`gv-liquiditaet-${o.value}`}
                      className={[
                        'inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2',
                        liquiditaet === o.value
                          ? 'border-bank-primary bg-bank-primary text-white'
                          : 'border-bank-border bg-white text-bank-text hover:border-bank-primary/50',
                      ].join(' ')}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Risikoneigung */}
              <fieldset>
                <legend className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
                  04 — Risikoneigung
                </legend>
                <div className="mt-4 flex flex-wrap gap-3">
                  {RISIKO_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setRisiko(o.value)}
                      aria-pressed={risiko === o.value}
                      data-testid={`gv-risiko-${o.value}`}
                      className={[
                        'inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2',
                        risiko === o.value
                          ? 'border-bank-primary bg-bank-primary text-white'
                          : 'border-bank-border bg-white text-bank-text hover:border-bank-primary/50',
                      ].join(' ')}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Ziele (Multi) */}
              <fieldset>
                <legend className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
                  05 — Ziele <span className="normal-case tracking-normal text-bank-text-soft">(Mehrfachauswahl)</span>
                </legend>
                <div className="mt-4 flex flex-wrap gap-3">
                  {ZIEL_OPTIONS.map((o) => {
                    const active = ziele.includes(o.value);
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => toggleZiel(o.value)}
                        aria-pressed={active}
                        data-testid={`gv-ziel-${o.value}`}
                        className={[
                          'inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2',
                          active
                            ? 'border-bank-primary bg-bank-primary text-white'
                            : 'border-bank-border bg-white text-bank-text hover:border-bank-primary/50',
                        ].join(' ')}
                      >
                        {active && <Check size={14} strokeWidth={2} aria-hidden />}
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="xl"
                  disabled={!canSubmit}
                  data-testid="gv-tool-submit"
                >
                  Übersicht anzeigen
                  <ArrowRight className="ml-1 h-4 w-4" strokeWidth={1.8} aria-hidden />
                </Button>
                {!canSubmit && (
                  <p className="mt-3 text-[12.5px] text-bank-text-soft" role="status">
                    Bitte geben Sie einen Anlagebetrag ab 100.000 € an und wählen Sie mindestens ein Ziel.
                  </p>
                )}
              </div>
            </div>

            {/* --- Ergebnis-Panel --- */}
            <aside
              className="lg:sticky lg:top-24 lg:self-start"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="border border-bank-border bg-white p-7 shadow-editorial-sm">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
                  Ihre Ausgangssituation
                </p>
                {!submitted ? (
                  <p className="mt-4 text-[14.5px] leading-[1.8] text-bank-text-muted" data-testid="gv-result-empty">
                    Wählen Sie Anlagevermögen, Horizont, Liquiditätsbedarf, Risikoneigung und Ziele.
                    Anschließend erscheinen hier die für Ihre Situation relevanten Themen — ohne
                    Kauf- oder Verkaufsempfehlung.
                  </p>
                ) : (
                  <div data-testid="gv-result-panel">
                    <dl className="mt-5 divide-y divide-bank-border">
                      <div className="flex items-baseline justify-between gap-4 py-3">
                        <dt className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Anlagevermögen</dt>
                        <dd className="font-display text-[1.15rem] font-medium text-bank-text" data-testid="gv-result-betrag">
                          {formatEuro(currentBetrag)}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 py-3">
                        <dt className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Horizont</dt>
                        <dd className="text-[14px] font-medium text-bank-text">
                          {HORIZONT_OPTIONS.find((o) => o.value === horizont)?.label}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 py-3">
                        <dt className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Liquiditätsbedarf</dt>
                        <dd className="text-[14px] font-medium text-bank-text">
                          {LIQUIDITAET_OPTIONS.find((o) => o.value === liquiditaet)?.label}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 py-3">
                        <dt className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Ausrichtung</dt>
                        <dd className="text-[14px] font-medium text-bank-text">
                          {RISIKO_OPTIONS.find((o) => o.value === risiko)?.label}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 py-3">
                        <dt className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Ziele</dt>
                        <dd className="max-w-[65%] text-right text-[13.5px] font-medium leading-snug text-bank-text">
                          {ziele.map((z) => ZIEL_OPTIONS.find((o) => o.value === z)?.label).join(' · ')}
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-6 font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
                      Für Ihre Situation relevant
                    </p>
                    <ul className="mt-4 space-y-4" data-testid="gv-result-themes">
                      {relevantThemes.map((key) => {
                        const t = THEME_META[key];
                        return (
                          <li key={key} className="border-t border-bank-border pt-4 first:border-0 first:pt-0">
                            <p className="font-display text-[1.05rem] font-medium leading-snug text-bank-text">
                              {t.title}
                            </p>
                            <p className="mt-1.5 text-[13.5px] leading-[1.7] text-bank-text-muted">{t.body}</p>
                            <Link
                              to={t.href}
                              data-testid={`gv-result-theme-${key}-cta`}
                              className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-bank-primary hover:text-bank-primary/80"
                            >
                              {t.ctaLabel}
                              <ArrowUpRight size={13} strokeWidth={1.8} aria-hidden />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>

                    <p className="mt-6 text-[11.5px] leading-relaxed text-bank-text-soft">
                      Diese Übersicht ist eine Einordnung — keine individuelle Anlage­beratung und
                      keine automatische Prozent-Allokation.
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </form>
        </div>
      </section>

      {/* ── VERTRAUEN ───────────────────────────────────────────────── */}
      {/* Phase-2-Simulator vor dem Vertrauensbereich mounten. */}
      <VermoegensStrukturSimulator
        phase1={{
          betrag: currentBetrag,
          horizont: HORIZONT_OPTIONS.find((o) => o.value === horizont)?.label,
          liquiditaet: LIQUIDITAET_OPTIONS.find((o) => o.value === liquiditaet)?.label,
          risiko: RISIKO_OPTIONS.find((o) => o.value === risiko)?.label,
          ziele,
        }}
      />

      {/* ── VERTRAUEN ───────────────────────────────────────────────── */}
      <section className="border-b border-bank-border bg-bank-surface-elev/40 py-16 sm:py-20" aria-labelledby="gv-vertrauen-title">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <Eyebrow>Klarheit für größere Vermögen</Eyebrow>
          <h2
            id="gv-vertrauen-title"
            className="mt-5 max-w-3xl font-display text-[clamp(1.55rem,3.2vw+0.6rem,2.35rem)] font-light leading-[1.1] tracking-[-0.02em] text-bank-text"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
          >
            Drei Prinzipien, an denen wir uns messen lassen.
          </h2>
          <div className="mt-12 grid gap-x-10 gap-y-12 md:grid-cols-3 lg:gap-x-14">
            {VERTRAUEN.map((v, i) => {
              const Icon = v.icon;
              return (
                <article key={v.eyebrow} data-testid={`gv-vertrauen-${i + 1}`} className="flex flex-col">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
                      {v.eyebrow}
                    </span>
                    <span className="h-px flex-1 bg-bank-border" aria-hidden />
                    <Icon className="h-5 w-5 shrink-0 text-bank-primary" strokeWidth={LUCIDE_STROKE} aria-hidden />
                  </div>
                  <h3 className="mt-5 font-display text-[1.35rem] font-light leading-snug tracking-[-0.01em] text-bank-text">
                    {v.title}
                  </h3>
                  <p className="mt-3 text-[14.5px] leading-[1.8] text-bank-text-muted">{v.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ABSCHLUSS-CTA ───────────────────────────────────────────── */}
      <section className="border-b border-bank-border py-16 sm:py-20" aria-labelledby="gv-closing-title">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:items-end lg:gap-14">
            <div>
              <Eyebrow>Nächster Schritt</Eyebrow>
              <h2
                id="gv-closing-title"
                className="mt-5 font-display text-[clamp(1.55rem,3vw+0.6rem,2.25rem)] font-light leading-[1.1] tracking-[-0.02em] text-bank-text"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
              >
                Sprechen wir über Ihr Vermögen — ohne Zeit- und Produktdruck.
              </h2>
              <p className="mt-5 max-w-2xl text-[15px] leading-[1.8] text-bank-text-muted">
                Ein persönliches Vermögens­gespräch ordnet Ihre Ausgangssituation, Ihre Ziele und
                Ihren Zeit­horizont ein — abgestimmt auf Ihre individuelle Lage.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
              <Link
                to="/contact"
                data-testid="gv-closing-primary-cta"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-bank-primary px-7 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-bank-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2"
              >
                Vermögensgespräch vereinbaren
                <ArrowRight size={16} strokeWidth={1.8} aria-hidden />
              </Link>
              <Link
                to="/leistungen"
                data-testid="gv-closing-secondary-cta"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-bank-border bg-white px-7 py-3 text-[14px] font-medium text-bank-text transition-colors hover:border-bank-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2"
              >
                Leistungen im Überblick
                <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden />
              </Link>
            </div>
          </div>

          <p className="mt-14 max-w-4xl border-t border-bank-border pt-6 text-[12px] leading-[1.7] text-bank-text-soft">
            {RISIKO_HINT}
          </p>
        </div>
      </section>
    </div>
  );
}
