import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Layers3,
  Timer,
  AlertTriangle,
  Info,
  RefreshCw,
} from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import { Button } from '@/components/ui/button';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import ReportBuilder from '@/components/groessere-vermoegen/ReportBuilder';

/**
 * Session 80.86 · Phase 2 „Größere Vermögen" — Vermögensstruktur-Simulator.
 * Reiner Analyse-Baustein — KEINE Anlage­beratung, keine Prozent-Empfehlung,
 * keine Rendite-Prognose. Verwendet ausschließlich vom Nutzer eingegebene
 * Werte + real vorhandene Zinsangebote aus der bestehenden savings_offers
 * Datenquelle (lazy-loaded).
 */

const LUCIDE_STROKE = 1.5;

const LAUFZEITEN = [
  { key: 'daily',     label: 'Täglich verfügbar', months: 0,  liquidity: 'Sofort verfügbar',   liquidityScore: 1.0 },
  { key: 'm3',        label: '3 Monate',           months: 3,  liquidity: 'Kurz gebunden',      liquidityScore: 0.75 },
  { key: 'm6',        label: '6 Monate',           months: 6,  liquidity: 'Kurz gebunden',      liquidityScore: 0.6 },
  { key: 'm12',       label: '12 Monate',          months: 12, liquidity: 'Mittelfristig',      liquidityScore: 0.4 },
  { key: 'm24',       label: '24 Monate',          months: 24, liquidity: 'Länger gebunden',    liquidityScore: 0.2 },
  { key: 'm36',       label: '36 Monate',          months: 36, liquidity: 'Lang gebunden',      liquidityScore: 0.1 },
];

const SCENARIOS = [
  { id: 'liquid',   name: 'Höhere Liquidität',     defaults: { liquid: 40, verzinslich: 40, wertpapiere: 15, sonstiges: 5 } },
  { id: 'balanced', name: 'Ausgewogene Struktur',  defaults: { liquid: 20, verzinslich: 30, wertpapiere: 40, sonstiges: 10 } },
  { id: 'long',     name: 'Höherer langfristiger Anteil', defaults: { liquid: 10, verzinslich: 20, wertpapiere: 60, sonstiges: 10 } },
];

const ENTNAHME_OPTIONS = [
  { value: 'keine',   label: 'Keine geplant' },
  { value: 'unter10', label: 'Unter 10 %' },
  { value: '10-25',   label: '10 – 25 %' },
  { value: 'ueber25', label: 'Über 25 %' },
];
const RESERVE_OPTIONS = [
  { value: 'keine',    label: 'Keine' },
  { value: 'unter6',   label: 'Unter 6 Monate' },
  { value: '6-12',     label: '6 – 12 Monate' },
  { value: 'ueber12',  label: 'Über 12 Monate' },
];

const EURO = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const PCT  = (v) => `${(Math.round((Number(v) || 0) * 10) / 10).toLocaleString('de-DE')} %`;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const parseIntFromString = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const parsePctFromString = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d.]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? clamp(n, 0, 100) : 0;
};

/** Rechnet aus vorhandenen Nutzer­angaben eine transparent nachvollziehbare Struktur. */
function computeStructure({ betrag, wertpapierPct, verzinsBetrag, reserveBetrag }) {
  const total = Math.max(0, Number(betrag) || 0);
  if (total <= 0) return { total: 0, liquid: 0, verzinslich: 0, wertpapiere: 0, sonstiges: 0, complete: false };

  const wp = clamp(Math.round(total * (Number(wertpapierPct) || 0) / 100), 0, total);
  const verz = clamp(Math.round(Number(verzinsBetrag) || 0), 0, total - wp);
  const reserve = clamp(Math.round(Number(reserveBetrag) || 0), 0, total - wp - verz);
  const rest = Math.max(0, total - wp - verz - reserve);
  return {
    total,
    liquid: reserve,
    verzinslich: verz,
    wertpapiere: wp,
    sonstiges: rest,
    complete: (reserve + verz + wp + rest) === total,
  };
}

const KATEGORIE_COLORS = {
  liquid:      { fg: 'rgb(0 87 176)',   soft: 'rgba(0,87,176,0.12)',   label: 'Liquidität' },
  verzinslich: { fg: 'rgb(54 168 82)',  soft: 'rgba(54,168,82,0.14)',  label: 'Verzinsliche Anlagen' },
  wertpapiere: { fg: 'rgb(181 136 83)', soft: 'rgba(181,136,83,0.16)', label: 'Wertpapiere' },
  sonstiges:   { fg: 'rgb(140 133 120)',soft: 'rgba(140,133,120,0.16)',label: 'Sonstiges / nicht zugeordnet' },
};

/** Kompakter SVG-Donut ohne Fremdbibliothek — Ergebnis auch textuell kommuniziert. */
function StructureDonut({ struct, size = 200, strokeWidth = 22 }) {
  const total = Math.max(0, struct.total);
  const radius = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * radius;
  const parts = ['liquid','verzinslich','wertpapiere','sonstiges']
    .map((k) => ({ k, value: struct[k] || 0, pct: total > 0 ? (struct[k] || 0) / total : 0 }));
  let offset = 0;
  const summaryText = parts.map((p) => `${KATEGORIE_COLORS[p.k].label}: ${PCT(p.pct * 100)}`).join(', ');
  return (
    <div className="flex items-center gap-6" role="group" aria-label="Vermögensstruktur">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size/2} cy={size/2} r={radius} stroke="rgb(229 223 211)" strokeWidth={strokeWidth} fill="transparent" />
        {total > 0 && parts.map((p) => {
          if (p.value <= 0) return null;
          const dash = p.pct * c;
          const dashArray = `${dash} ${c - dash}`;
          const el = (
            <circle
              key={p.k}
              cx={size/2}
              cy={size/2}
              r={radius}
              stroke={KATEGORIE_COLORS[p.k].fg}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={dashArray}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size/2} ${size/2})`}
            />
          );
          offset += dash;
          return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" className="fill-current text-bank-text" style={{ fontSize: 13, fontWeight: 500 }}>
          Gesamt
        </text>
        <text x="50%" y="60%" textAnchor="middle" className="fill-current text-bank-text" style={{ fontSize: 15, fontWeight: 600 }}>
          {total > 0 ? EURO.format(total) : '—'}
        </text>
      </svg>
      <ul className="flex-1 space-y-2 text-[13.5px]">
        {parts.map((p) => (
          <li key={p.k} className="flex items-baseline justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-bank-text-muted">
              <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: KATEGORIE_COLORS[p.k].fg }} />
              {KATEGORIE_COLORS[p.k].label}
            </span>
            <span className="font-medium text-bank-text">
              {total > 0 ? PCT(p.pct * 100) : '—'} <span className="ml-2 text-bank-text-soft">({EURO.format(p.value)})</span>
            </span>
          </li>
        ))}
      </ul>
      <span className="sr-only">{summaryText}</span>
    </div>
  );
}

/** Konzentrations-/Klumpen-Regel: > 60 % einer Kategorie ist ein Hinweis wert. */
function deriveClusterHints(struct) {
  const total = struct.total || 0;
  if (total <= 0) return [];
  const rules = [
    { key: 'wertpapiere', text: 'Ihre angegebene Struktur weist eine hohe Konzentration in Wertpapieren auf.' },
    { key: 'verzinslich',text: 'Ein großer Teil des Vermögens liegt in verzinslichen Einlagen.' },
    { key: 'liquid',     text: 'Ein großer Teil des Vermögens ist kurzfristig verfügbar (Liquiditätsreserve).' },
    { key: 'sonstiges',  text: 'Ein großer Teil des Vermögens ist keiner Kategorie zugeordnet.' },
  ];
  return rules
    .map((r) => ({ ...r, share: (struct[r.key] || 0) / total }))
    .filter((r) => r.share >= 0.6)
    .map((r) => ({ text: r.text, share: r.share }));
}

/** Bündelt Zinsangebote je Ziel-Laufzeit in ±3-Monats-Fenster. */
function aggregateOffersByTerm(offers) {
  const groups = LAUFZEITEN.map((l) => ({ ...l, offers: [] }));
  offers.forEach((o) => {
    const m = Number(o.deposit_term ?? 0);
    let target;
    if (m === 0) target = groups.find((g) => g.months === 0);
    else if (m <= 4) target = groups.find((g) => g.months === 3);
    else if (m <= 9) target = groups.find((g) => g.months === 6);
    else if (m <= 18) target = groups.find((g) => g.months === 12);
    else if (m <= 30) target = groups.find((g) => g.months === 24);
    else target = groups.find((g) => g.months === 36);
    if (target) target.offers.push(o);
  });
  return groups.map((g) => {
    const rates = g.offers.map((o) => Number(o.interest_rate)).filter((n) => Number.isFinite(n) && n > 0);
    return {
      ...g,
      offerCount: g.offers.length,
      minRate: rates.length ? Math.min(...rates) : null,
      maxRate: rates.length ? Math.max(...rates) : null,
    };
  });
}

export default function VermoegensStrukturSimulator({ phase1 }) {
  const { betrag: p1Betrag, horizont, liquiditaet, risiko, ziele } = phase1 || {};

  // Extra Eingaben (Phase 2)
  const [entnahmen, setEntnahmen] = useState('keine');
  const [bestReserve, setBestReserve] = useState('unter6');
  const [wertpapierPctIn, setWertpapierPctIn] = useState('');
  const [verzinsBetragIn, setVerzinsBetragIn] = useState('');
  const [reserveBetragIn, setReserveBetragIn] = useState('');
  const [anzahlInstitute, setAnzahlInstitute] = useState('');

  const wertpapierPct = parsePctFromString(wertpapierPctIn);
  const verzinsBetrag = parseIntFromString(verzinsBetragIn);
  const reserveBetrag = parseIntFromString(reserveBetragIn);
  const institute = Math.max(0, parseIntFromString(anzahlInstitute));

  const struct = useMemo(
    () => computeStructure({ betrag: p1Betrag, wertpapierPct, verzinsBetrag, reserveBetrag }),
    [p1Betrag, wertpapierPct, verzinsBetrag, reserveBetrag],
  );

  const totalAlloc = struct.liquid + struct.verzinslich + struct.wertpapiere;
  const restBetrag = Math.max(0, (Number(p1Betrag) || 0) - totalAlloc);
  const overAllocated = totalAlloc > (Number(p1Betrag) || 0);

  // Zins-/Laufzeitenleiter (lazy)
  const [zinsLoad, setZinsLoad] = useState(isSupabaseConfigured ? 'idle' : 'unsupported');
  const [offers, setOffers] = useState([]);
  const zinsGroups = useMemo(() => aggregateOffersByTerm(offers), [offers]);

  const loadZinsen = useCallback(async () => {
    if (!isSupabaseConfigured) { setZinsLoad('unsupported'); return; }
    setZinsLoad('loading');
    try {
      const { data, error } = await supabase
        .from('savings_offers')
        .select('id, interest_rate, deposit_term, investment_type, banks(country, name)')
        .eq('is_active', true)
        .limit(500);
      if (error) throw error;
      setOffers(Array.isArray(data) ? data : []);
      setZinsLoad('ready');
    } catch (e) {
      console.error('[GV-Simulator] savings_offers load failed:', e);
      setZinsLoad('error');
    }
  }, []);

  // Ladder-Simulator
  const [ladder, setLadder] = useState(() => LAUFZEITEN.map((l) => ({ key: l.key, amount: 0 })));
  const ladderSum = ladder.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const ladderRest = Math.max(0, (Number(p1Betrag) || 0) - ladderSum);
  const ladderOver = ladderSum > (Number(p1Betrag) || 0);
  const weightedMonths = useMemo(() => {
    if (ladderSum <= 0) return 0;
    const total = ladder.reduce((acc, r) => {
      const l = LAUFZEITEN.find((x) => x.key === r.key);
      return acc + (Number(r.amount) || 0) * (l?.months || 0);
    }, 0);
    return total / ladderSum;
  }, [ladder, ladderSum]);

  const applyEqualLadder = () => {
    const total = Number(p1Betrag) || 0;
    if (total <= 0) return;
    const each = Math.floor(total / LAUFZEITEN.length);
    setLadder(LAUFZEITEN.map((l, i) => ({
      key: l.key,
      amount: i === 0 ? total - each * (LAUFZEITEN.length - 1) : each,
    })));
  };
  const clearLadder = () => setLadder(LAUFZEITEN.map((l) => ({ key: l.key, amount: 0 })));

  // Szenarien
  const [activeScenario, setActiveScenario] = useState('balanced');
  const [scenarios, setScenarios] = useState(() => Object.fromEntries(SCENARIOS.map((s) => [s.id, { ...s.defaults }])));
  const setScenarioValue = (id, key, value) => {
    setScenarios((prev) => ({ ...prev, [id]: { ...prev[id], [key]: clamp(parseIntFromString(value), 0, 100) } }));
  };
  const resetScenario = (id) => setScenarios((prev) => ({ ...prev, [id]: { ...SCENARIOS.find((s) => s.id === id).defaults } }));
  const scenarioSum = (id) => {
    const s = scenarios[id] || {};
    return (s.liquid || 0) + (s.verzinslich || 0) + (s.wertpapiere || 0) + (s.sonstiges || 0);
  };
  const activeScenarioBetrag = (id, key) => {
    const total = Number(p1Betrag) || 0;
    return Math.round(total * (scenarios[id]?.[key] || 0) / 100);
  };

  const clusterHints = deriveClusterHints(struct);
  const wertpapierWarnung = wertpapierPct > 100;
  const inputsOK = (Number(p1Betrag) || 0) >= 100000;

  // Liquiditäts­reserve-Hinweis (regelbasiert, keine Zahl in Stein)
  const liquidHints = useMemo(() => {
    const hints = [];
    if (liquiditaet === 'hoch') hints.push('Sie haben einen hohen Liquiditätsbedarf angegeben — der Bereich „Liquidität & Reserve" sollte in Ihrer Struktur besonders sichtbar sein.');
    if (entnahmen === 'ueber25') hints.push('Ein größerer Teil Ihres Vermögens soll kurzfristig verfügbar bleiben — planen Sie diesen Anteil bewusst außerhalb längerer Bindungen.');
    if (bestReserve === 'keine' && (Number(p1Betrag) || 0) > 0) hints.push('Sie haben aktuell keine Liquiditäts­reserve angegeben. Ob und in welchem Umfang eine Reserve sinnvoll ist, hängt von Ihrer persönlichen Situation ab.');
    return hints;
  }, [liquiditaet, entnahmen, bestReserve, p1Betrag]);

  return (
    <section
      id="vermoegens-struktur-simulator"
      data-testid="gv-simulator"
      className="border-b border-bank-border bg-white py-16 sm:py-24"
      aria-labelledby="gv-sim-title"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
        <Eyebrow>Vermögensstruktur-Simulator · Phase 2</Eyebrow>
        <h2
          id="gv-sim-title"
          className="mt-5 max-w-3xl font-display text-[clamp(1.55rem,3.2vw+0.6rem,2.35rem)] font-light leading-[1.1] tracking-[-0.02em] text-bank-text"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
        >
          Struktur, Liquidität, Laufzeiten — professionell durchdacht.
        </h2>
        <p className="mt-5 max-w-2xl text-[15px] leading-[1.8] text-bank-text-muted">
          Der Simulator zeigt Ihre <strong>eigene</strong> Struktur, aggregiert echte Zinsangebote in
          eine Laufzeitenleiter und hilft Ihnen, Konzentrationen und Liquidität sichtbar zu machen —
          ohne Kauf- oder Verkaufs­empfehlung und ohne Rendite-Prognose.
        </p>

        {!inputsOK && (
          <div className="mt-8 border-l-2 border-bank-gold bg-bank-surface-elev/50 p-5 text-[13.5px] leading-[1.7] text-bank-text-muted" role="status">
            Bitte legen Sie zunächst im Bereich „Vermögen strukturieren" oben Ihre Ausgangs­angaben fest
            (Anlagevermögen ab 100.000 €, Horizont, Liquiditätsbedarf, Risikoneigung, Ziele). Anschließend
            werden hier die weiter­führenden Analysen aktiv.
          </div>
        )}

        {/* ── 1) Ergänzende Eingaben ─────────────────────────────── */}
        <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-14" aria-labelledby="gv-sim-input-title">
          <div>
            <h3 id="gv-sim-input-title" className="font-display text-[1.35rem] font-light leading-snug text-bank-text">
              Ihre ergänzenden Angaben
            </h3>
            <p className="mt-2 text-[13.5px] text-bank-text-soft">
              Alle Felder sind freiwillig — je vollständiger, desto präziser die Struktur­analyse.
            </p>

            <fieldset className="mt-6">
              <legend className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
                A — Geplante kurzfristige Entnahmen
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {ENTNAHME_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setEntnahmen(o.value)}
                    aria-pressed={entnahmen === o.value}
                    data-testid={`gv-sim-entnahmen-${o.value}`}
                    className={[
                      'inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2',
                      entnahmen === o.value ? 'border-bank-primary bg-bank-primary text-white' : 'border-bank-border bg-white text-bank-text hover:border-bank-primary/50',
                    ].join(' ')}
                  >{o.label}</button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-6">
              <legend className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
                B — Bestehende Liquiditäts­reserve
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {RESERVE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setBestReserve(o.value)}
                    aria-pressed={bestReserve === o.value}
                    data-testid={`gv-sim-reserve-${o.value}`}
                    className={[
                      'inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2',
                      bestReserve === o.value ? 'border-bank-primary bg-bank-primary text-white' : 'border-bank-border bg-white text-bank-text hover:border-bank-primary/50',
                    ].join(' ')}
                  >{o.label}</button>
                ))}
              </div>
            </fieldset>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="gv-sim-wp" className="block font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-text-muted">
                  C — Wertpapierquote (%)
                </label>
                <input
                  id="gv-sim-wp"
                  type="text"
                  inputMode="decimal"
                  value={wertpapierPctIn}
                  onChange={(e) => setWertpapierPctIn(e.target.value)}
                  placeholder="z. B. 35"
                  data-testid="gv-sim-wp-input"
                  className="mt-2 min-h-[48px] w-full rounded-md border border-bank-border bg-white px-4 py-2 text-[15px] font-medium text-bank-text placeholder:text-bank-text-soft focus:border-bank-primary focus:outline-none focus:ring-2 focus:ring-bank-primary/20"
                />
                {wertpapierWarnung && <p role="alert" className="mt-1 text-[12px] text-bank-error">Bitte 0–100 %.</p>}
              </div>
              <div>
                <label htmlFor="gv-sim-verz" className="block font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-text-muted">
                  D — Verzinsliche Einlagen (€)
                </label>
                <input
                  id="gv-sim-verz"
                  type="text"
                  inputMode="numeric"
                  value={verzinsBetragIn}
                  onChange={(e) => setVerzinsBetragIn(e.target.value)}
                  placeholder="z. B. 150.000"
                  data-testid="gv-sim-verz-input"
                  className="mt-2 min-h-[48px] w-full rounded-md border border-bank-border bg-white px-4 py-2 text-[15px] font-medium text-bank-text placeholder:text-bank-text-soft focus:border-bank-primary focus:outline-none focus:ring-2 focus:ring-bank-primary/20"
                />
              </div>
              <div>
                <label htmlFor="gv-sim-res" className="block font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-text-muted">
                  Aktuelle Liquiditäts­reserve (€)
                </label>
                <input
                  id="gv-sim-res"
                  type="text"
                  inputMode="numeric"
                  value={reserveBetragIn}
                  onChange={(e) => setReserveBetragIn(e.target.value)}
                  placeholder="z. B. 50.000"
                  data-testid="gv-sim-res-input"
                  className="mt-2 min-h-[48px] w-full rounded-md border border-bank-border bg-white px-4 py-2 text-[15px] font-medium text-bank-text placeholder:text-bank-text-soft focus:border-bank-primary focus:outline-none focus:ring-2 focus:ring-bank-primary/20"
                />
              </div>
              <div>
                <label htmlFor="gv-sim-inst" className="block font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-text-muted">
                  Anzahl Institute (verzinslich)
                </label>
                <input
                  id="gv-sim-inst"
                  type="text"
                  inputMode="numeric"
                  value={anzahlInstitute}
                  onChange={(e) => setAnzahlInstitute(e.target.value)}
                  placeholder="z. B. 3"
                  data-testid="gv-sim-inst-input"
                  className="mt-2 min-h-[48px] w-full rounded-md border border-bank-border bg-white px-4 py-2 text-[15px] font-medium text-bank-text placeholder:text-bank-text-soft focus:border-bank-primary focus:outline-none focus:ring-2 focus:ring-bank-primary/20"
                />
              </div>
            </div>

            {overAllocated && (
              <p role="alert" className="mt-4 text-[13px] font-medium text-bank-error">
                Summe aus Wertpapieren + verzinslichen Einlagen + Reserve überschreitet Ihr Anlage­vermögen ({EURO.format(totalAlloc)} von {EURO.format(p1Betrag || 0)}). Bitte anpassen.
              </p>
            )}
          </div>

          {/* ── 2) Struktur-Übersicht ──────────────────────────── */}
          <div className="border border-bank-border bg-bank-surface-elev/40 p-6 shadow-editorial-sm" data-testid="gv-sim-struct">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Ihre Vermögensstruktur</p>
            <p className="mt-1 text-[12px] text-bank-text-soft">Analyse, keine Empfehlung — auf Basis Ihrer Eingaben.</p>
            <div className="mt-5">
              <StructureDonut struct={struct} />
            </div>
            <dl className="mt-6 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
              <div className="flex justify-between border-b border-bank-border py-1.5">
                <dt className="text-bank-text-muted">Gesamtvermögen</dt>
                <dd className="font-medium text-bank-text" data-testid="gv-sim-gesamt">{EURO.format(struct.total)}</dd>
              </div>
              <div className="flex justify-between border-b border-bank-border py-1.5">
                <dt className="text-bank-text-muted">Horizont</dt>
                <dd className="font-medium text-bank-text">{horizont || '—'}</dd>
              </div>
              <div className="flex justify-between border-b border-bank-border py-1.5">
                <dt className="text-bank-text-muted">Liquiditätsbedarf</dt>
                <dd className="font-medium text-bank-text">{liquiditaet || '—'}</dd>
              </div>
              <div className="flex justify-between border-b border-bank-border py-1.5">
                <dt className="text-bank-text-muted">Ausrichtung</dt>
                <dd className="font-medium text-bank-text">{risiko || '—'}</dd>
              </div>
              <div className="flex justify-between py-1.5 sm:col-span-2">
                <dt className="text-bank-text-muted">Bestehende Reserve</dt>
                <dd className="font-medium text-bank-text">
                  {RESERVE_OPTIONS.find((o) => o.value === bestReserve)?.label} · {EURO.format(reserveBetrag)}
                </dd>
              </div>
              <div className="flex justify-between py-1.5 sm:col-span-2">
                <dt className="text-bank-text-muted">Nicht zugeordnet</dt>
                <dd className="font-medium text-bank-text">{EURO.format(restBetrag)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* ── 3) Liquidität & Reserve ────────────────────────────── */}
        <section className="mt-16 border-t border-bank-border pt-12" aria-labelledby="gv-sim-liquid-title">
          <Eyebrow>Liquidität & Reserve</Eyebrow>
          <h3 id="gv-sim-liquid-title" className="mt-3 font-display text-[1.5rem] font-light leading-snug tracking-[-0.015em] text-bank-text">
            Kurzfristig verfügbar — bewusst geplant.
          </h3>
          <div className="mt-6 grid gap-6 lg:grid-cols-3" data-testid="gv-sim-liquid">
            <div className="border border-bank-border bg-white p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Reserve-Anteil</p>
              <p className="mt-3 font-display text-[1.6rem] font-medium text-bank-text">
                {struct.total > 0 ? PCT((struct.liquid / struct.total) * 100) : '—'}
              </p>
              <p className="mt-1 text-[13px] text-bank-text-muted">{EURO.format(struct.liquid)} liquide</p>
            </div>
            <div className="border border-bank-border bg-white p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Kurzfristiger Bedarf</p>
              <p className="mt-3 text-[13.5px] leading-[1.7] text-bank-text-muted">
                {liquiditaet || 'Angabe fehlt'} · Entnahmen: {ENTNAHME_OPTIONS.find((o) => o.value === entnahmen)?.label}
              </p>
            </div>
            <div className="border border-bank-border bg-white p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Bestehende Reserve</p>
              <p className="mt-3 text-[13.5px] leading-[1.7] text-bank-text-muted">
                {RESERVE_OPTIONS.find((o) => o.value === bestReserve)?.label}
              </p>
            </div>
          </div>
          {liquidHints.length > 0 && (
            <ul className="mt-6 space-y-2" data-testid="gv-sim-liquid-hints">
              {liquidHints.map((h, i) => (
                <li key={i} className="flex items-start gap-3 border-l-2 border-bank-gold bg-bank-surface-elev/30 p-4 text-[13.5px] leading-[1.7] text-bank-text-muted">
                  <Info size={16} strokeWidth={LUCIDE_STROKE} className="mt-0.5 shrink-0 text-bank-gold" aria-hidden />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── 4) Zins- und Laufzeitenleiter ──────────────────────── */}
        <section className="mt-16 border-t border-bank-border pt-12" aria-labelledby="gv-sim-zins-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Zins- und Laufzeitenstruktur</Eyebrow>
              <h3 id="gv-sim-zins-title" className="mt-3 font-display text-[1.5rem] font-light leading-snug tracking-[-0.015em] text-bank-text">
                Angebote nach Fälligkeit — echte Marktdaten.
              </h3>
              <p className="mt-2 text-[13px] text-bank-text-soft">
                Zinsbänder werden aus den derzeit aktiven Angeboten im Sparvergleich gebildet — keine erfundenen Werte, keine Prognosen.
              </p>
            </div>
            {zinsLoad === 'idle' && (
              <Button type="button" variant="secondary" onClick={loadZinsen} data-testid="gv-sim-zins-load">
                Zinsangebote laden
                <ArrowRight className="ml-1 h-4 w-4" strokeWidth={1.8} aria-hidden />
              </Button>
            )}
            {zinsLoad === 'ready' && (
              <button type="button" onClick={loadZinsen} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-bank-primary hover:text-bank-primary/80" data-testid="gv-sim-zins-reload">
                <RefreshCw size={13} strokeWidth={1.8} aria-hidden /> Aktualisieren
              </button>
            )}
          </div>

          <div className="mt-6 overflow-hidden border border-bank-border" data-testid="gv-sim-zins-table" role="region" aria-label="Zinsbänder je Laufzeit">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 border-b border-bank-border bg-bank-surface-elev/40 px-4 py-3 text-[11px] font-mono uppercase tracking-[0.22em] text-bank-text-muted sm:grid-cols-[1.4fr_0.8fr_1fr_1fr]">
              <span>Laufzeit</span>
              <span>Angebote</span>
              <span>Zinsband</span>
              <span>Liquiditätsgrad</span>
            </div>
            {zinsLoad === 'idle' && (
              <div className="px-4 py-6 text-[13.5px] text-bank-text-muted">
                Laden Sie die aktuellen Angebote, um die Zinsbänder je Laufzeit einzusehen.
              </div>
            )}
            {zinsLoad === 'loading' && (
              <div className="px-4 py-6 text-[13.5px] text-bank-text-muted">Wird geladen …</div>
            )}
            {zinsLoad === 'error' && (
              <div className="px-4 py-6 text-[13.5px] text-bank-error">Angebote konnten nicht geladen werden. Bitte später erneut versuchen.</div>
            )}
            {zinsLoad === 'unsupported' && (
              <div className="px-4 py-6 text-[13.5px] text-bank-text-muted">Zinsdatenquelle steht in dieser Umgebung nicht zur Verfügung.</div>
            )}
            {zinsLoad === 'ready' && zinsGroups.map((g) => (
              <div key={g.key} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] items-baseline gap-4 border-t border-bank-border px-4 py-4 text-[13.5px] sm:grid-cols-[1.4fr_0.8fr_1fr_1fr]">
                <span className="font-medium text-bank-text">{g.label}</span>
                <span className="text-bank-text-muted">{g.offerCount}</span>
                <span className="text-bank-text">
                  {g.minRate != null && g.maxRate != null
                    ? (g.minRate === g.maxRate ? `${g.maxRate.toLocaleString('de-DE')} %` : `${g.minRate.toLocaleString('de-DE')} – ${g.maxRate.toLocaleString('de-DE')} %`)
                    : <span className="text-bank-text-soft">—</span>}
                </span>
                <span className="text-bank-text-muted">{g.liquidity}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-bank-text-soft">
            <Link to="/comparison" className="font-semibold text-bank-primary hover:text-bank-primary/80">Zu allen Angeboten im Sparvergleich →</Link>
          </p>
        </section>

        {/* ── 5) Ladder-Simulator ────────────────────────────────── */}
        <section className="mt-16 border-t border-bank-border pt-12" aria-labelledby="gv-sim-ladder-title">
          <Eyebrow>Ladder-Simulator</Eyebrow>
          <h3 id="gv-sim-ladder-title" className="mt-3 font-display text-[1.5rem] font-light leading-snug tracking-[-0.015em] text-bank-text">
            Ihren Betrag auf Laufzeiten verteilen.
          </h3>
          <p className="mt-2 text-[13px] text-bank-text-soft">
            Sie bestimmen die Beträge selbst — Preset „Gleichmäßig verteilen" ist rein <em>mathematisch</em>,
            keine Empfehlung.
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr] lg:gap-10">
            <div className="border border-bank-border" data-testid="gv-sim-ladder">
              <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-3 border-b border-bank-border bg-bank-surface-elev/40 px-4 py-3 text-[11px] font-mono uppercase tracking-[0.22em] text-bank-text-muted">
                <span>Laufzeit</span>
                <span>Betrag (€)</span>
                <span>Anteil</span>
              </div>
              {LAUFZEITEN.map((l) => {
                const row = ladder.find((r) => r.key === l.key) || { amount: 0 };
                const share = ladderSum > 0 ? (row.amount / ladderSum) * 100 : 0;
                return (
                  <div key={l.key} className="grid grid-cols-[1.4fr_1fr_1fr] items-center gap-3 border-t border-bank-border px-4 py-3">
                    <label htmlFor={`gv-ladder-${l.key}`} className="text-[13.5px] font-medium text-bank-text">{l.label}</label>
                    <input
                      id={`gv-ladder-${l.key}`}
                      data-testid={`gv-ladder-input-${l.key}`}
                      type="text"
                      inputMode="numeric"
                      value={row.amount || ''}
                      onChange={(e) => {
                        const v = parseIntFromString(e.target.value);
                        setLadder((prev) => prev.map((r) => r.key === l.key ? { ...r, amount: v } : r));
                      }}
                      placeholder="0"
                      className="min-h-[44px] w-full rounded-md border border-bank-border bg-white px-3 py-2 text-[14px] font-medium text-bank-text placeholder:text-bank-text-soft focus:border-bank-primary focus:outline-none focus:ring-2 focus:ring-bank-primary/20"
                    />
                    <span className="text-[13px] text-bank-text-muted">{PCT(share)}</span>
                  </div>
                );
              })}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bank-border bg-bank-surface-elev/40 px-4 py-3 text-[13px]">
                <div className="flex items-center gap-4">
                  <span className="text-bank-text-muted">Summe</span>
                  <span className="font-semibold text-bank-text" data-testid="gv-ladder-sum">{EURO.format(ladderSum)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-bank-text-muted">Restbetrag</span>
                  <span className={['font-semibold', ladderOver ? 'text-bank-error' : 'text-bank-text'].join(' ')} data-testid="gv-ladder-rest">
                    {ladderOver ? `-${EURO.format(ladderSum - (Number(p1Betrag) || 0))}` : EURO.format(ladderRest)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-between">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Ø Bindungsdauer</p>
                <p className="mt-2 font-display text-[1.5rem] font-medium text-bank-text" data-testid="gv-ladder-wm">
                  {ladderSum > 0 ? `${weightedMonths.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Monate` : '—'}
                </p>
                <p className="mt-2 text-[12.5px] text-bank-text-soft">
                  Rechnerisch aus Ihrer eigenen Verteilung — keine Renditeaussage.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="button" variant="secondary" size="sm" onClick={applyEqualLadder} data-testid="gv-ladder-equal">
                  Gleichmäßig verteilen <span className="ml-1 text-[11px] font-normal text-bank-text-soft">(math. Preset)</span>
                </Button>
                <button
                  type="button"
                  onClick={clearLadder}
                  data-testid="gv-ladder-clear"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-bank-border bg-white px-4 py-2 text-[13px] font-medium text-bank-text hover:border-bank-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2"
                >
                  Zurücksetzen
                </button>
              </div>
              {ladderOver && (
                <p role="alert" className="mt-4 text-[13px] font-medium text-bank-error">
                  Ihre Verteilung überschreitet das Anlagevermögen um {EURO.format(ladderSum - (Number(p1Betrag) || 0))}.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── 6) Einlagensicherungs-Check ────────────────────────── */}
        <section className="mt-16 border-t border-bank-border pt-12" aria-labelledby="gv-sim-esi-title">
          <Eyebrow>Einlagensicherung im Blick</Eyebrow>
          <h3 id="gv-sim-esi-title" className="mt-3 font-display text-[1.5rem] font-light leading-snug tracking-[-0.015em] text-bank-text">
            Verzinsliche Anlagen — institutsspezifisch prüfen.
          </h3>
          <div className="mt-6 grid gap-6 lg:grid-cols-3" data-testid="gv-sim-esi">
            <div className="border border-bank-border bg-white p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Verzinslich gesamt</p>
              <p className="mt-3 font-display text-[1.35rem] font-medium text-bank-text">{EURO.format(verzinsBetrag)}</p>
              <p className="mt-1 text-[12.5px] text-bank-text-soft">Aus Ihren Angaben.</p>
            </div>
            <div className="border border-bank-border bg-white p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Anzahl Institute</p>
              <p className="mt-3 font-display text-[1.35rem] font-medium text-bank-text">{institute || '—'}</p>
              <p className="mt-1 text-[12.5px] text-bank-text-soft">Wie viele Banken halten diese Einlagen?</p>
            </div>
            <div className="border border-bank-border bg-white p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Ø pro Institut</p>
              <p className="mt-3 font-display text-[1.35rem] font-medium text-bank-text">
                {institute > 0 ? EURO.format(Math.round(verzinsBetrag / institute)) : '—'}
              </p>
              <p className="mt-1 text-[12.5px] text-bank-text-soft">Rechnerischer Durchschnitt.</p>
            </div>
          </div>
          <div className="mt-6 flex items-start gap-3 border-l-2 border-bank-gold bg-bank-surface-elev/30 p-4 text-[13.5px] leading-[1.7] text-bank-text-muted">
            <ShieldCheck size={16} strokeWidth={LUCIDE_STROKE} className="mt-0.5 shrink-0 text-bank-gold" aria-hidden />
            <span>
              In der EU liegt die gesetzliche Einlagen­sicherungsgrenze regelmäßig bei
              <strong> 100.000 € pro Person und Institut</strong>. Freiwillige Sicherungs­systeme
              (z. B. deutsche Einlagen­sicherungsfonds) gelten nur institutsspezifisch. Wir behaupten
              hier <strong>keine</strong> pauschale Absicherung Ihres Gesamt­betrags — die konkrete Absicherung
              ist für jede einzelne Bank zu prüfen.
              {institute > 0 && Math.round(verzinsBetrag / institute) > 100000 && (
                <> <strong className="block mt-2">Hinweis:</strong> Ihr rechnerischer Durchschnitts­betrag pro Institut liegt oberhalb der EU-Regelgrenze — dies sollte je Bank überprüft werden.</>
              )}
            </span>
          </div>
        </section>

        {/* ── 7) Struktur & Risiko + Klumpen ─────────────────────── */}
        <section className="mt-16 border-t border-bank-border pt-12" aria-labelledby="gv-sim-risk-title">
          <Eyebrow>Struktur & Risiko</Eyebrow>
          <h3 id="gv-sim-risk-title" className="mt-3 font-display text-[1.5rem] font-light leading-snug tracking-[-0.015em] text-bank-text">
            Konzentrationen sichtbar machen.
          </h3>
          <div className="mt-6" data-testid="gv-sim-risk">
            <StructureDonut struct={struct} />
          </div>
          {clusterHints.length > 0 ? (
            <ul className="mt-6 space-y-2" data-testid="gv-sim-cluster-hints">
              {clusterHints.map((h, i) => (
                <li key={i} className="flex items-start gap-3 border-l-2 border-bank-amber bg-bank-amber-tint/60 p-4 text-[13.5px] leading-[1.7] text-bank-text-muted">
                  <AlertTriangle size={16} strokeWidth={LUCIDE_STROKE} className="mt-0.5 shrink-0 text-bank-amber-strong" aria-hidden />
                  <span>{h.text} <span className="text-bank-text-soft">({PCT(h.share * 100)})</span></span>
                </li>
              ))}
            </ul>
          ) : (
            struct.total > 0 && (
              <p className="mt-6 text-[13.5px] text-bank-text-muted">Auf Basis Ihrer Angaben ist keine einzelne Kategorie überproportional dominant.</p>
            )
          )}
          <div className="mt-6 flex flex-wrap gap-3 text-[13px]">
            <Link to="/aktien" className="inline-flex items-center gap-1.5 font-semibold text-bank-primary hover:text-bank-primary/80" data-testid="gv-sim-risk-link-aktien">
              Aktien-Vergleich & Risikoanalyse öffnen <ArrowUpRight size={13} strokeWidth={1.8} aria-hidden />
            </Link>
            <Link to="/wissen" className="inline-flex items-center gap-1.5 font-semibold text-bank-primary hover:text-bank-primary/80" data-testid="gv-sim-risk-link-wissen">
              Diversifikation im Wissenscenter <ArrowUpRight size={13} strokeWidth={1.8} aria-hidden />
            </Link>
          </div>
        </section>

        {/* ── 8) Szenariovergleich ───────────────────────────────── */}
        <section className="mt-16 border-t border-bank-border pt-12" aria-labelledby="gv-sim-scen-title">
          <Eyebrow>Beispielhafte Strukturvarianten</Eyebrow>
          <h3 id="gv-sim-scen-title" className="mt-3 font-display text-[1.5rem] font-light leading-snug tracking-[-0.015em] text-bank-text">
            Drei Varianten — keine Empfehlung, kein Ranking.
          </h3>
          <p className="mt-2 text-[13px] text-bank-text-soft">
            Prozentwerte sind vollständig editierbar. Es gibt kein „bestes" Szenario — die Passung
            zu Ihrer persönlichen Situation lässt sich nur im Gespräch klären.
          </p>

          <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Strukturvarianten wählen">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={activeScenario === s.id}
                onClick={() => setActiveScenario(s.id)}
                data-testid={`gv-sim-scen-tab-${s.id}`}
                className={[
                  'inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2',
                  activeScenario === s.id ? 'border-bank-primary bg-bank-primary text-white' : 'border-bank-border bg-white text-bank-text hover:border-bank-primary/50',
                ].join(' ')}
              >{s.name}</button>
            ))}
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3" data-testid="gv-sim-scen-grid">
            {SCENARIOS.map((s) => {
              const values = scenarios[s.id];
              const sum = scenarioSum(s.id);
              const invalid = sum !== 100;
              return (
                <article
                  key={s.id}
                  className={[
                    'border p-5',
                    activeScenario === s.id ? 'border-bank-primary bg-bank-primary-soft' : 'border-bank-border bg-white',
                  ].join(' ')}
                  data-testid={`gv-sim-scen-card-${s.id}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-display text-[1.05rem] font-medium text-bank-text">{s.name}</p>
                    <button type="button" onClick={() => resetScenario(s.id)} className="text-[11px] text-bank-text-muted hover:text-bank-primary" data-testid={`gv-sim-scen-reset-${s.id}`}>
                      Zurücksetzen
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-bank-text-soft">Beispielhafte Strukturvariante — keine Empfehlung.</p>

                  <dl className="mt-4 space-y-2">
                    {[
                      { key: 'liquid',      label: 'Liquidität' },
                      { key: 'verzinslich', label: 'Verzinsliche Anlagen' },
                      { key: 'wertpapiere', label: 'Wertpapiere' },
                      { key: 'sonstiges',   label: 'Sonstiges' },
                    ].map((row) => (
                      <div key={row.key} className="flex items-center justify-between gap-3">
                        <dt className="flex items-center gap-2 text-[12.5px] text-bank-text-muted">
                          <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: KATEGORIE_COLORS[row.key].fg }} />
                          {row.label}
                        </dt>
                        <dd className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={values[row.key] ?? 0}
                            onChange={(e) => setScenarioValue(s.id, row.key, e.target.value)}
                            aria-label={`${row.label} Prozent (${s.name})`}
                            data-testid={`gv-sim-scen-input-${s.id}-${row.key}`}
                            className="w-16 min-h-[36px] rounded border border-bank-border bg-white px-2 py-1 text-right text-[13px] font-medium text-bank-text focus:border-bank-primary focus:outline-none focus:ring-2 focus:ring-bank-primary/20"
                          />
                          <span className="text-[12px] text-bank-text-muted">%</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className={['mt-4 flex items-baseline justify-between border-t pt-3 text-[12.5px]', invalid ? 'border-bank-error text-bank-error' : 'border-bank-border'].join(' ')}>
                    <span className="text-bank-text-muted">Summe</span>
                    <span className="font-semibold" data-testid={`gv-sim-scen-sum-${s.id}`}>{sum} %</span>
                  </div>
                  {invalid && (
                    <p role="alert" className="mt-1 text-[11.5px] text-bank-error">
                      Summe muss 100 % ergeben (aktuell {sum} %).
                    </p>
                  )}
                  {!invalid && (Number(p1Betrag) || 0) > 0 && (
                    <ul className="mt-4 space-y-1 text-[11.5px] text-bank-text-soft">
                      <li>Liquidität: {EURO.format(activeScenarioBetrag(s.id, 'liquid'))}</li>
                      <li>Verzinsliche: {EURO.format(activeScenarioBetrag(s.id, 'verzinslich'))}</li>
                      <li>Wertpapiere: {EURO.format(activeScenarioBetrag(s.id, 'wertpapiere'))}</li>
                      <li>Sonstiges: {EURO.format(activeScenarioBetrag(s.id, 'sonstiges'))}</li>
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* ── 8b) Phase-3 · Vermögensreport ─────────────────────── */}
        <ReportBuilder
          phase1={phase1}
          phase2={{ entnahmen, bestReserve, wertpapierPct, verzinsBetrag, reserveBetrag, institute }}
          struct={struct}
          ladder={ladder}
          scenarios={scenarios}
          activeScenario={activeScenario}
          clusterHints={clusterHints}
          liquidHints={liquidHints}
          zinsGroups={zinsLoad === 'ready' ? zinsGroups : null}
          zinsLoadedAt={zinsLoad === 'ready' ? new Date().toISOString() : null}
        />

        {/* ── 9) CTA & Hinweise ──────────────────────────────────── */}
        <section className="mt-16 border-t border-bank-border pt-12" aria-labelledby="gv-sim-cta-title">
          <div className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:items-end lg:gap-14">
            <div>
              <Eyebrow>Struktur persönlich besprechen</Eyebrow>
              <h3 id="gv-sim-cta-title" className="mt-3 font-display text-[1.5rem] font-light leading-snug tracking-[-0.015em] text-bank-text">
                Ihre Ausgangs­situation, Ihre Ziele — im Gespräch.
              </h3>
              <p className="mt-3 text-[14.5px] leading-[1.8] text-bank-text-muted">
                Die Struktur­analyse ordnet Ihre Angaben — keine automatische Empfehlung. Ein
                persönliches Vermögens­gespräch verbindet Ihre Situation mit den bestehenden
                Produkt- und Beratungs­bereichen von Fröhlich.
              </p>
              <p className="mt-3 text-[12px] leading-relaxed text-bank-text-soft">
                „Ergebnis speichern" wird in einer späteren Phase mit Konto­kontext ergänzt — keine
                Zwischen­speicherung in der aktuellen Session.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
              <Link
                to="/contact"
                data-testid="gv-sim-cta-contact"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-bank-primary px-7 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-bank-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2"
              >
                Vermögensgespräch vereinbaren
                <ArrowRight size={16} strokeWidth={1.8} aria-hidden />
              </Link>
              <Link
                to="/comparison"
                data-testid="gv-sim-cta-comparison"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-bank-border bg-white px-7 py-3 text-[14px] font-medium text-bank-text transition-colors hover:border-bank-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2"
              >
                Zinsangebote vergleichen
                <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
