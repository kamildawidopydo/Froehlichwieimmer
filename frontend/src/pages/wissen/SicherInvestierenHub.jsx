import { getApiBase } from '@/lib/apiBase';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowUpRight, ShieldCheck, TrendingDown, Clock3, Zap, Landmark, AlertTriangle } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import { WISSEN_ARTICLES } from '@/data/wissenArticles';
import { resolveAccentPair } from '@/design-system/accents';
import { matchWissenBridge } from '@/design-system/newsroom';
import FormatBadge from '@/components/newsroom/FormatBadge';

const api = axios.create({ baseURL: `${getApiBase()}/api`, withCredentials: false });

/* ------------------------------------------------------------------ *
 * Safety Framework — reusable data model (Session 80.49).
 * Kein numerisches Rating. Farbe ist NIE das einzige Signal — jede
 * Level-Angabe ist von einer Klartext-Erklärung begleitet.
 * ------------------------------------------------------------------ */
const LEVEL = { LOW: 'niedrig', MID: 'mittel', HIGH: 'erhöht' };

const LEVEL_STYLE = {
  niedrig: 'text-bank-sage-strong border-bank-sage-border bg-bank-sage-tint',
  mittel:  'text-bank-text border-bank-border bg-neutral-50',
  erhöht:  'text-bank-amber-strong border-bank-amber-border bg-bank-amber-tint',
};

const DIMENSIONS = [
  { key: 'kapital',    label: 'Kapitalrisiko',   desc: 'Wie stark kann der nominale Wert schwanken oder verloren gehen?', icon: TrendingDown },
  { key: 'insolvenz',  label: 'Insolvenzschutz', desc: 'Was passiert, wenn Bank, Broker, Emittent oder Fondsanbieter ausfällt?', icon: Landmark },
  { key: 'liquiditaet',label: 'Liquidität',      desc: 'Wie schnell ist das Geld verfügbar?', icon: Zap },
  { key: 'zins',       label: 'Zinsrisiko',      desc: 'Wie empfindlich reagiert der Kurs auf veränderte Marktzinsen?', icon: TrendingDown },
  { key: 'inflation',  label: 'Inflationsrisiko',desc: 'Wie stark kann Inflation die reale Kaufkraft mindern?', icon: TrendingDown },
  { key: 'laufzeit',   label: 'Laufzeit',        desc: 'Ist das Kapital vertraglich oder wirtschaftlich gebunden?', icon: Clock3 },
];

const INSTRUMENTS = [
  {
    slug: 'tagesgeld', name: 'Tagesgeld',
    what: 'Verzinstes Sichteinlagenkonto bei einer Bank, ohne feste Laufzeit.',
    profile: { kapital: LEVEL.LOW, insolvenz: LEVEL.LOW, liquiditaet: LEVEL.LOW, zins: LEVEL.LOW, inflation: LEVEL.HIGH, laufzeit: LEVEL.LOW },
    caveat: 'Nominale Stabilität sagt nichts über reale Kaufkraft. Inflation kann den Realwert deutlich mindern.',
    horizon: 'kurzfristig (Liquiditätsreserve)',
  },
  {
    slug: 'festgeld', name: 'Festgeld',
    what: 'Bankeinlage mit fixer Laufzeit und festem Zins über die Laufzeit.',
    profile: { kapital: LEVEL.LOW, insolvenz: LEVEL.LOW, liquiditaet: LEVEL.HIGH, zins: LEVEL.LOW, inflation: LEVEL.HIGH, laufzeit: LEVEL.HIGH },
    caveat: 'Vorzeitige Verfügung meist nicht oder nur mit Zinsabschlag möglich. Nominal-vs-Real-Unterscheidung wichtig.',
    horizon: 'kurz- bis mittelfristig',
  },
  {
    slug: 'geldmarktfonds', name: 'Geldmarktfonds',
    what: 'Fonds, der überwiegend in kurzlaufende Geldmarkttitel investiert — als Sondervermögen strukturiert.',
    profile: { kapital: LEVEL.LOW, insolvenz: LEVEL.LOW, liquiditaet: LEVEL.LOW, zins: LEVEL.LOW, inflation: LEVEL.HIGH, laufzeit: LEVEL.LOW },
    caveat: 'Nicht durch Einlagensicherung geschützt — Schutz erfolgt über den Sondervermögensstatus, nicht über einen Sicherungstopf.',
    horizon: 'kurzfristig',
  },
  {
    slug: 'staatsanleihen', name: 'Staatsanleihen',
    what: 'Verzinsliche Schuldtitel eines Staates mit fester Laufzeit und Nominalwert-Rückzahlung.',
    profile: { kapital: LEVEL.MID, insolvenz: LEVEL.MID, liquiditaet: LEVEL.MID, zins: LEVEL.MID, inflation: LEVEL.HIGH, laufzeit: LEVEL.HIGH },
    caveat: 'Bonität, Währung und Laufzeit bleiben relevant — „Staatsanleihe" bedeutet nicht automatisch risikofrei.',
    horizon: 'mittel- bis langfristig',
  },
  {
    slug: 'unternehmensanleihen', name: 'Unternehmensanleihen',
    what: 'Verzinsliche Schuldtitel von Unternehmen — höhere Rendite gegen höheres Emittentenrisiko.',
    profile: { kapital: LEVEL.MID, insolvenz: LEVEL.HIGH, liquiditaet: LEVEL.MID, zins: LEVEL.MID, inflation: LEVEL.HIGH, laufzeit: LEVEL.HIGH },
    caveat: 'Bonitätsspreizung ist erheblich. Investment-Grade und High-Yield unterscheiden sich fundamental.',
    horizon: 'mittelfristig',
  },
  {
    slug: 'etfs', name: 'Breit diversifizierte ETFs',
    what: 'Passive Fonds, die einen breiten Aktienindex nachbilden — als Sondervermögen strukturiert.',
    profile: { kapital: LEVEL.HIGH, insolvenz: LEVEL.LOW, liquiditaet: LEVEL.LOW, zins: LEVEL.MID, inflation: LEVEL.LOW, laufzeit: LEVEL.LOW },
    caveat: 'Kursschwankungen sind Teil des Konzepts. Der Sondervermögensstatus schützt vor Anbieter-Insolvenz — nicht vor Marktverlusten.',
    horizon: 'langfristig',
  },
];

const DISTINCTIONS = [
  { title: 'Einlagensicherung ≠ Sondervermögen', body: 'Bankguthaben und Fondsanteile sind über völlig unterschiedliche Mechanismen geschützt. Bei Bankinsolvenz greift die Einlagensicherung; bei Fondsanbieter-Insolvenz bleibt das Fondsvermögen als Sondervermögen rechtlich vom Anbieter getrennt.' },
  { title: 'Nominal sicher ≠ real sicher',        body: '10.000 € können nominal unverändert bleiben und real trotzdem an Kaufkraft verlieren, wenn die Inflation die Nominal­verzinsung übersteigt.' },
  { title: 'Kursschwankung ≠ endgültiger Verlust', body: 'Ein Kurs­rückgang bedeutet noch keinen realisierten Verlust — er wird es erst durch den Verkauf. Trotzdem ist Schwankung ein reales Risiko, wenn Liquidität vor Ablauf des Horizonts nötig wird.' },
  { title: 'Staatsanleihe ≠ risikofrei',          body: 'Auch Staatsanleihen tragen Bonitäts-, Währungs- und Zinsänderungsrisiken. Die Bewertung hängt vom Emittenten, der Laufzeit und dem Umfeld ab.' },
  { title: 'ETF ≠ Einlagensicherung',             body: 'ETFs sind nicht Teil der gesetzlichen Einlagensicherung. Der Schutzmechanismus ist der Sondervermögensstatus — nicht ein Sicherungstopf für ausgefallene Anbieter.' },
];

const SCENARIOS = [
  { title: 'Notgroschen',                        focus: 'Liquidität + nominale Stabilität', body: 'Für den Notfall zählt sofortiger Zugriff und ein stabiler Nominalwert. Nominal-stabile Bankeinlagen mit sofortiger Verfügbarkeit sind hier oft die passende Struktur — die Inflations­frage ist zweitrangig gegenüber Verfügbarkeit.' },
  { title: 'Geld in 2 Jahren benötigt',          focus: 'Zeithorizont + Schwankung + Laufzeit', body: 'Bei kurzem Horizont wird Volatilität zum echten Risiko. Instrumente, deren Wertentwicklung zeitlich zum Bedarf passt, gewinnen an Bedeutung — Aktien-ETFs sind in dieser Frist selten die Struktur der Wahl.' },
  { title: 'Langfristiger Vermögensaufbau',      focus: 'Inflation + Diversifikation + Marktrisiko', body: 'Über Jahrzehnte wird Inflation zum zentralen Risiko. Marktrisiko ist über Zeit und Diversifikation zu steuern; nominal-stabile Anlagen tragen alleine selten den realen Vermögens­aufbau.' },
  { title: 'Ruhestand / Entnahmephase',          focus: 'Liquidität + Sequenzrisiko + Stabilität', body: 'In der Entnahme­phase ist die Reihenfolge der Renditen entscheidend. Ein Puffer aus stabilen Anlagen kann verhindern, dass Entnahmen zu ungünstigen Kursen realisiert werden müssen.' },
];

const DECISION_QUESTIONS = [
  'Wann brauche ich das Geld?',
  'Wie viel Schwankung verträgt der Zeitraum?',
  'Muss das Kapital jederzeit verfügbar sein?',
  'Geht es um nominalen Kapitalerhalt oder reale Kaufkraft?',
  'Welche Rolle spielt Diversifikation?',
  'Welche Risiken möchte ich bewusst vermeiden?',
];

/* ---------- Risk Check editorial entries (only real Wissen matches) ---------- */
const RISK_CHECK_ENTRIES = [
  { title: 'Tagesgeld: Was schützt die Einlagensicherung?', tags: ['tagesgeld','einlagensicherung','sparen'] },
  { title: 'Geldmarktfonds: Sicher wie Tagesgeld?',         tags: ['geldmarktfonds','sondervermögen','fonds'] },
  { title: 'ETF: Was passiert bei Anbieter-Insolvenz?',      tags: ['etf','sondervermögen','fonds'] },
  { title: 'Staatsanleihen: Welche Risiken bleiben?',        tags: ['anleihen','staatsanleihen','bonität'] },
  { title: 'Festgeld: Rendite gegen Flexibilität',           tags: ['festgeld','laufzeit','sparen'] },
];

/* --------------------------------- Page --------------------------------- */
export default function SicherInvestierenHub() {
  const { primary: sage, secondary: champ } = resolveAccentPair('sage', 'champagne');

  const [news, setNews] = useState([]);
  useEffect(() => {
    let mounted = true;
    api.get('/news/nachrichten', { params: { category: 'sicher-investieren', limit: 6 } })
      .then((res) => { if (mounted) setNews(res.data?.items || []); })
      .catch(() => { if (mounted) setNews([]); });
    return () => { mounted = false; };
  }, []);

  // Real content matches for the Risk Check list — no fake links.
  const riskCheckLinks = useMemo(() => RISK_CHECK_ENTRIES.map((rc) => {
    const [match] = matchWissenBridge({ tags: rc.tags }, WISSEN_ARTICLES, 1);
    return { ...rc, article: match || null };
  }), []);

  return (
    <div className="min-h-screen bg-bank-bg text-bank-text" data-testid="sicher-investieren-hub">
      <PageMeta
        title="Sicher investieren — Fröhlich Vermögensberatung"
        description="Sicherheit ist mehrdimensional. Kapitalverlust, Insolvenzschutz, Liquidität, Zins-, Inflations- und Laufzeitrisiko im editorialen Vergleich."
        path="/wissen/sicher-investieren"
      />

      {/* HERO */}
      <section className="border-b border-bank-border bg-bank-ink text-white">
        <div className="mx-auto max-w-[1100px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <p className={`font-mono text-[11px] uppercase tracking-[0.28em] ${sage.text}`}>Wissen · Sicher investieren</p>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-light leading-[1.05] tracking-[-0.02em] sm:text-5xl lg:text-6xl">
            Risiken verstehen.<br /><span className="italic font-light text-white/85">Vermögen schützen.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-white/85 sm:text-[16.5px]">
            Sicherheit ist mehrdimensional. Diese Seite vergleicht, wie unterschiedliche Anlageformen
            in einzelnen Risikodimensionen wirken — statt Sicherheit als ein einziges Etikett zu behandeln.
          </p>
          <p className="mt-6 max-w-2xl rounded border-l-2 border-white/40 bg-white/[0.04] px-4 py-3 text-[13.5px] leading-relaxed text-white/80">
            Keine Anlage ist in jeder Dimension risikofrei. Entscheidend ist, welche Risiken
            für Ihr Ziel, Ihren Zeithorizont und Ihren Liquiditätsbedarf relevant sind.
          </p>
        </div>
      </section>

      {/* FRAMEWORK */}
      <section className={`border-b border-bank-sage-border ${sage.tint}`}>
        <div className="mx-auto max-w-[1100px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <Eyebrow>Framework</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight sm:text-[36px]">Sechs Dimensionen finanzieller Sicherheit.</h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-bank-text-muted">
            Jede Dimension wird pro Anlageform mit einer Kurzeinordnung <em>und</em> einem Klartext-Kommentar dargestellt.
            Farbe ist nie das einzige Signal.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DIMENSIONS.map((d) => {
              const Icon = d.icon;
              return (
                <div key={d.key} className="border border-bank-sage-border bg-white p-5" data-testid={`safety-dim-${d.key}`}>
                  <div className="flex items-center gap-2">
                    <Icon size={16} strokeWidth={1.6} className={sage.text} aria-hidden />
                    <p className={`font-mono text-[10.5px] uppercase tracking-[0.22em] ${sage.text}`}>{d.label}</p>
                  </div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-bank-text-muted">{d.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* INSTRUMENTS */}
      <section className="border-b border-bank-border bg-white">
        <div className="mx-auto max-w-[1100px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <Eyebrow>Anlageformen im Vergleich</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight sm:text-[36px]">Sechs typische Bausteine — sechs unterschiedliche Risikoprofile.</h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-bank-text-muted">
            Kein Ranking. Kein „bestes Produkt". Jedes Instrument hat einen anderen Platz im Portfolio.
          </p>
          <div className="mt-10 space-y-8" role="list">
            {INSTRUMENTS.map((it) => (
              <article key={it.slug} role="listitem" className="border border-bank-border bg-white p-6 sm:p-8" data-testid={`safety-instrument-${it.slug}`}>
                <header className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-serif text-[22px] leading-snug text-bank-text sm:text-[26px]">{it.name}</h3>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">Horizont · {it.horizon}</span>
                </header>
                <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-bank-text-muted">{it.what}</p>
                <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Risikodimensionen">
                  {DIMENSIONS.map((d) => {
                    const val = it.profile[d.key];
                    return (
                      <li key={d.key} className={`border px-3 py-2 ${LEVEL_STYLE[val]}`}>
                        <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] opacity-70">{d.label}</p>
                        <p className="mt-0.5 text-[13px] font-medium capitalize">{val}</p>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-5 flex items-start gap-2 border-l-2 border-bank-amber-border bg-bank-amber-tint px-4 py-3 text-[13.5px] leading-relaxed text-bank-amber-ink">
                  <AlertTriangle size={14} strokeWidth={1.6} className="mt-0.5 shrink-0" aria-hidden />
                  <span><strong className="mr-1 uppercase tracking-[0.16em] text-[10px]">Wichtig</strong>{it.caveat}</span>
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* DISTINCTIONS */}
      <section className={`border-b border-bank-champagne-border ${champ.tint}`}>
        <div className="mx-auto max-w-[1100px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <Eyebrow>Zentrale Unterscheidungen</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight sm:text-[36px]">Fünf Missverständnisse, die häufig vermischt werden.</h2>
          <div className="mt-10 divide-y divide-bank-champagne-border border-y border-bank-champagne-border">
            {DISTINCTIONS.map((d) => (
              <div key={d.title} className="py-6" data-testid={`safety-distinction-${d.title.slice(0,8)}`}>
                <p className={`font-mono text-[10.5px] uppercase tracking-[0.22em] ${champ.text}`}>{d.title}</p>
                <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-bank-text">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROTECTION EXPLAINER — EU/DE context (regulatory numbers deferred to 80.50) */}
      <section className="border-b border-bank-border bg-white">
        <div className="mx-auto max-w-[1100px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <Eyebrow>Schutzmechanismen · EU / Deutschland</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight sm:text-[36px]">Wie Bankeinlagen, Fondsvermögen und Emittentenrisiko rechtlich geschützt sind.</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="border border-bank-border bg-white p-5">
              <p className={`font-mono text-[10.5px] uppercase tracking-[0.22em] ${sage.text}`}>Gesetzliche Einlagensicherung</p>
              <p className="mt-2 text-[14px] leading-relaxed text-bank-text">
                EU-harmonisiertes Schutzprinzip für Bankeinlagen bei Zahlungsunfähigkeit des Instituts.
                Die konkrete Deckungssumme und Verfahrensdetails werden im nächsten Trust-Update
                mit Primärquelle (BaFin/EBA) belegt.
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">Zu belegen · Trust Layer 80.50</p>
            </div>
            <div className="border border-bank-border bg-white p-5">
              <p className={`font-mono text-[10.5px] uppercase tracking-[0.22em] ${sage.text}`}>Sondervermögen bei Fonds</p>
              <p className="mt-2 text-[14px] leading-relaxed text-bank-text">
                Fondsvermögen ist rechtlich vom Vermögen des Anbieters getrennt. Bei Insolvenz
                der KVG bleibt das Fondsvermögen den Anlegern erhalten — die Rendite hängt
                weiter vom Marktverlauf ab.
              </p>
            </div>
            <div className="border border-bank-border bg-white p-5">
              <p className={`font-mono text-[10.5px] uppercase tracking-[0.22em] ${sage.text}`}>Emittentenrisiko bei Anleihen</p>
              <p className="mt-2 text-[14px] leading-relaxed text-bank-text">
                Zins- und Rückzahlung hängen an der Bonität des Emittenten. Ratings sind Hinweis,
                keine Garantie. Bei Staatsanleihen bleiben Währung und Laufzeit relevant.
              </p>
            </div>
            <div className="border border-bank-border bg-white p-5">
              <p className={`font-mono text-[10.5px] uppercase tracking-[0.22em] ${sage.text}`}>Depot- vs. Einlagen­verwahrung</p>
              <p className="mt-2 text-[14px] leading-relaxed text-bank-text">
                Wertpapiere im Depot sind kein Guthaben der Bank — sie bleiben Eigentum des Anlegers.
                Der Schutz erfolgt über die Depot­verwahrung, nicht über die Einlagensicherung.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DECISION FRAMEWORK */}
      <section className={`border-b border-bank-sage-border ${sage.tint}`}>
        <div className="mx-auto max-w-[1100px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <Eyebrow>Was bedeutet Sicherheit für mich?</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight sm:text-[36px]">Sechs Fragen, die Trade-offs sichtbar machen.</h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-bank-text-muted">
            Kein Portfolio-Vorschlag. Keine Empfehlung. Diese Fragen helfen einzuordnen,
            welche Risiken bewusst getragen werden — und welche vermieden werden sollen.
          </p>
          <ol className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DECISION_QUESTIONS.map((q, i) => (
              <li key={q} className="flex items-start gap-3 border border-bank-sage-border bg-white p-4">
                <span className={`font-mono text-[10.5px] uppercase tracking-[0.22em] ${sage.text}`}>{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[14.5px] leading-relaxed text-bank-text">{q}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* SCENARIOS */}
      <section className="border-b border-bank-border bg-white">
        <div className="mx-auto max-w-[1100px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <Eyebrow>Sicherheit in verschiedenen Situationen</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight sm:text-[36px]">Vier typische Situationen — vier unterschiedliche Prioritäten.</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {SCENARIOS.map((s) => (
              <article key={s.title} className="border border-bank-border bg-white p-6" data-testid={`safety-scenario-${s.title.slice(0,6)}`}>
                <h3 className="font-serif text-[20px] leading-snug text-bank-text">{s.title}</h3>
                <p className={`mt-1 font-mono text-[10.5px] uppercase tracking-[0.22em] ${sage.text}`}>Fokus · {s.focus}</p>
                <p className="mt-3 text-[14px] leading-relaxed text-bank-text-muted">{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* RISK CHECK LIST */}
      <section className={`border-b border-bank-champagne-border ${champ.tint}`}>
        <div className="mx-auto max-w-[1100px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <Eyebrow>Risk Checks</Eyebrow>
              <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight sm:text-[36px]">Einzelne Risiko-Fragen im Detail.</h2>
            </div>
            <FormatBadge format="risk_check" />
          </div>
          <ul className="mt-8 divide-y divide-bank-champagne-border border-y border-bank-champagne-border">
            {riskCheckLinks.map((rc) => (
              <li key={rc.title} className="py-5">
                {rc.article ? (
                  <Link
                    to={`/wissen/${rc.article.slug}`}
                    className="group flex items-start justify-between gap-6"
                    data-testid={`risk-check-link-${rc.article.slug}`}
                  >
                    <div className="min-w-0">
                      <p className="font-serif text-[17px] leading-snug text-bank-text group-hover:text-bank-primary">{rc.title}</p>
                      <p className="mt-1 text-[13px] text-bank-text-muted">Wissen: {rc.article.title}</p>
                    </div>
                    <span className="mt-1 inline-flex shrink-0 items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-primary">
                      Lesen <ArrowUpRight size={12} strokeWidth={1.7} />
                    </span>
                  </Link>
                ) : (
                  <div data-testid={`risk-check-gap-${rc.title.slice(0,10)}`}>
                    <p className="font-serif text-[17px] leading-snug text-bank-text/70">{rc.title}</p>
                    <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">Redaktioneller Content-Gap · geplant</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* AKTUELL ZUM THEMA — real news only */}
      {news.length > 0 && (
        <section className="border-b border-bank-border bg-white">
          <div className="mx-auto max-w-[1100px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
            <Eyebrow>Aktuell zum Thema</Eyebrow>
            <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight sm:text-[36px]">Nachrichten aus dem Newsroom.</h2>
            <ul className="mt-8 divide-y divide-bank-border border-y border-bank-border">
              {news.slice(0, 4).map((n) => (
                <li key={n.slug} className="py-5">
                  <Link to={`/news/${n.slug}`} className="group flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <p className="font-serif text-[17px] leading-snug text-bank-text group-hover:text-bank-primary">{n.title}</p>
                      {n.excerpt && <p className="mt-1 line-clamp-2 text-[13.5px] text-bank-text-muted">{n.excerpt}</p>}
                    </div>
                    <ArrowUpRight size={14} strokeWidth={1.7} className="mt-1 shrink-0 text-bank-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* DISCLAIMER */}
      <section className="bg-bank-surface/30 py-12">
        <div className="mx-auto max-w-[1100px] px-5 sm:px-8 lg:px-12">
          <p className="max-w-3xl text-[13px] leading-relaxed text-bank-text-muted">
            <ShieldCheck size={14} strokeWidth={1.6} className="mr-1 inline-block align-text-bottom text-bank-text-muted" aria-hidden />
            Diese Seite dient der allgemeinen Information und stellt keine individuelle
            Anlageberatung dar. Konkrete regulatorische Werte werden im nächsten
            Redaktions-Update (Trust Layer) mit Primärquellen versehen.
          </p>
        </div>
      </section>
    </div>
  );
}
