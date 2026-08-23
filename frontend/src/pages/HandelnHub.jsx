import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Search,
  ChevronDown,
  X,
  BookOpen,
  Layers,
  Target,
  Wallet,
  ShieldAlert,
  Compass,
  AlertTriangle,
} from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import RelatedKnowledge from '@/components/knowledge/RelatedKnowledge';
import { getRelatedKnowledge } from '@/data/knowledgeGraph';
import { cn } from '@/lib/utils';
import {
  BOERSEN_ABC,
  BOERSEN_ABC_LETTERS,
  BOERSEN_ABC_CATEGORIES,
  BOERSEN_ABC_COUNT,
} from '@/data/boersenAbc';

const SECTIONS = [
  { id: 'grundlagen', label: 'Grundlagen', icon: BookOpen },
  { id: 'anlageklassen', label: 'Anlageklassen', icon: Layers },
  { id: 'orderarten', label: 'Orderarten', icon: Target },
  { id: 'kosten', label: 'Kosten & Steuern', icon: Wallet },
  { id: 'risiken', label: 'Risiken', icon: ShieldAlert },
  { id: 'abc', label: 'Börsen-ABC', icon: Compass },
  { id: 'fehler', label: 'Häufige Fehler', icon: AlertTriangle },
];

const ASSET_CLASSES = [
  {
    title: 'Aktien',
    body: 'Anteil am Eigenkapital eines Unternehmens. Chancen: Kursgewinne und Dividenden. Risiken: Kursverluste bis Totalverlust.',
    href: '/themen/aktien',
    linkLabel: 'Zum Themenbereich Aktien',
  },
  {
    title: 'Anleihen',
    body: 'Verzinstes Schuldpapier. Regelmäßige Kupons, Rückzahlung am Laufzeitende — abhängig von der Bonität des Emittenten.',
    href: '/themen/anleihen',
    linkLabel: 'Zum Themenbereich Anleihen',
  },
  {
    title: 'Fonds & ETFs',
    body: 'Bündeln viele Titel in einem Sondervermögen. Aktiv gemanagt oder regelbasiert (Index). Diversifikation ab kleinen Beträgen.',
    href: '/fonds-grundlagen',
    linkLabel: 'Zu den Fonds-Grundlagen',
  },
  {
    title: 'Dividendenstrategien',
    body: 'Fokus auf Ausschüttungen etablierter Unternehmen. Chancen: laufende Erträge. Wichtig: Ausschüttungen sind nicht garantiert.',
    href: '/themen/dividenden',
    linkLabel: 'Zum Themenbereich Dividenden',
  },
];

const ORDER_TYPES = [
  {
    name: 'Market-Order',
    lead: 'Sofortige Ausführung zum nächstverfügbaren Kurs.',
    body: 'Schnell, aber ohne Preiskontrolle. In volatilen Phasen kann der tatsächliche Ausführungspreis deutlich vom Anzeigekurs abweichen.',
  },
  {
    name: 'Limit-Order',
    lead: 'Nur Ausführung, wenn der Wunsch­preis erreicht ist.',
    body: 'Preiskontrolle statt Ausführungs­garantie. Die Order kann teilweise oder gar nicht bedient werden — je nach Markttiefe.',
  },
  {
    name: 'Stop-Loss-Order',
    lead: 'Absicherung: wird nach Auslöser zur Market-Order.',
    body: 'Begrenzt Verluste oder sichert Gewinne. Bei Kurslücken (Gaps) kann die Ausführung deutlich schlechter als der Stop-Preis ausfallen.',
  },
  {
    name: 'Stop-Limit-Order',
    lead: 'Kombination aus Stop-Auslöser und anschließendem Limit.',
    body: 'Schützt vor extremen Ausführungs­kursen. Nachteil: In Stress­phasen bleibt die Order eventuell unausgeführt.',
  },
  {
    name: 'Trailing-Stop',
    lead: 'Dynamischer Stop, der Gewinnen nach­gezogen wird.',
    body: 'Der Auslöser wird bei steigenden Kursen automatisch mit­geführt und bleibt stehen, wenn der Kurs fällt.',
  },
];

const COSTS = [
  {
    title: 'Ordergebühren',
    body: 'Fallen pro Kauf oder Verkauf an. Modelle: Fixbetrag, prozentual vom Volumen oder eine Kombination. Über viele Trades summieren sich diese Beträge deutlich.',
  },
  {
    title: 'Spread',
    body: 'Differenz zwischen Geld- (Bid) und Briefkurs (Ask). Ein impliziter Kostenblock — je enger der Spread, desto günstiger die Ausführung.',
  },
  {
    title: 'Laufende Fondskosten (TER)',
    body: 'Werden im Anteilskurs von Fonds und ETFs bereits abgezogen. Sie umfassen Management-, Verwaltungs- und Vertriebskosten — nicht jedoch Transaktions­kosten.',
  },
  {
    title: 'Depotgebühren',
    body: 'Manche Institute berechnen ein laufendes Verwahrentgelt für das Wertpapierdepot. Bei vielen Discount-Brokern ist es entfallen.',
  },
  {
    title: 'Abgeltungssteuer & Freistellungsauftrag',
    body: 'Kapitalerträge in Deutschland sind grundsätzlich abgeltungssteuerpflichtig. Über den Freistellungsauftrag lassen sich Erträge bis zum Sparerpauschbetrag steuerfrei stellen. Individuelle steuerliche Auswirkungen bitte mit einem Steuerberater klären.',
    disclaimer: true,
  },
];

const RISK_POINTS = [
  {
    title: 'Marktrisiko',
    body: 'In breiten Kursrückgängen fallen auch diversifizierte Portfolios. Weder Aktien noch Anleihen sind davor gefeit.',
  },
  {
    title: 'Bonitätsrisiko',
    body: 'Bei Anleihen und Zertifikaten trägt der Anleger das Ausfallrisiko des Emittenten. Auch etablierte Namen sind vor Rating­herabstufungen nicht geschützt.',
  },
  {
    title: 'Liquiditätsrisiko',
    body: 'Wenig gehandelte Titel lassen sich in Stressphasen nur mit spürbaren Preisabschlägen verkaufen.',
  },
  {
    title: 'Wechselkursrisiko',
    body: 'Fremdwährungs­anlagen bewegen sich zusätzlich mit dem Kurs der jeweiligen Währung — das kann Rendite verstärken oder auslöschen.',
  },
  {
    title: 'Zinsänderungsrisiko',
    body: 'Bei laufenden Anleihen führen steigende Marktzinsen zu fallenden Kursen — je länger die Restlaufzeit, desto sensibler.',
  },
  {
    title: 'Verhalten & Timing',
    body: 'Emotionsgetriebene Ein- und Ausstiege sind einer der häufigsten Renditekiller. Ein klarer Anlageplan und Regeln helfen, in schwierigen Phasen ruhig zu bleiben.',
  },
];

const COMMON_MISTAKES = [
  {
    title: 'Keine Diversifikation',
    body: 'Ein Portfolio aus wenigen Einzelaktien einer Branche trägt Klumpenrisiken. Eine breite Streuung reduziert titelspezifische Risiken.',
  },
  {
    title: 'Nach Schlagzeilen handeln',
    body: 'Kurzfristige Reaktionen auf Nachrichten überlagern die eigene Strategie. Ein regelbasiertes Vorgehen ist meist widerstandsfähiger.',
  },
  {
    title: 'Kosten unterschätzen',
    body: 'Hohe Ordergebühren, Spreads und laufende Fondskosten schmälern die Netto­rendite über Jahre erheblich.',
  },
  {
    title: 'Kein Anlagehorizont definiert',
    body: 'Ohne klaren Zeithorizont geraten kurzfristig gedachte Trades und langfristige Bausteine durcheinander. Anlageklasse und Risiko sollten zum Zeithorizont passen.',
  },
  {
    title: 'Verluste aussitzen, Gewinne früh mitnehmen',
    body: 'Die Kombination führt statistisch zu einem ungünstigen Rendite-/Risiko-Verhältnis. Ein Regelwerk für Verkaufsentscheidungen hilft.',
  },
  {
    title: 'Steuern und Freibeträge ignorieren',
    body: 'Freistellungs­auftrag richtig verteilen und Verlustverrechnungstöpfe im Blick behalten — häufig lohnt eine Rücksprache mit dem Steuerberater.',
  },
];

const scrollToId = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 96;
  window.scrollTo({ top, behavior: 'smooth' });
};

const HandelnHub = () => {
  const [query, setQuery] = useState('');
  const [activeLetter, setActiveLetter] = useState('all');
  const [openTerms, setOpenTerms] = useState(new Set());
  const searchRef = useRef(null);

  const filteredTerms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BOERSEN_ABC.filter((t) => {
      if (activeLetter !== 'all' && t.letter !== activeLetter) return false;
      if (!q) return true;
      return (
        t.term.toLowerCase().includes(q) ||
        t.short.toLowerCase().includes(q) ||
        (t.long || '').toLowerCase().includes(q)
      );
    });
  }, [query, activeLetter]);

  const groupedTerms = useMemo(() => {
    const map = new Map();
    filteredTerms.forEach((t) => {
      if (!map.has(t.letter)) map.set(t.letter, []);
      map.get(t.letter).push(t);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredTerms]);

  const toggleTerm = (key) => {
    setOpenTerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearSearch = () => {
    setQuery('');
    setActiveLetter('all');
    setOpenTerms(new Set());
    if (searchRef.current) searchRef.current.focus();
  };

  // Beim Suchen automatisch alle Treffer aufklappen, damit sie sofort sichtbar sind
  useEffect(() => {
    if (query.trim()) {
      setOpenTerms(new Set(filteredTerms.map((t) => `${t.letter}-${t.term}`)));
    }
  }, [query, filteredTerms]);

  const availableLetters = useMemo(() => new Set(BOERSEN_ABC_LETTERS), []);

  return (
    <div className="bg-white" data-testid="handeln-hub-page">
      <PageMeta
        title="Investieren lernen — Börsen-Wissen & Börsen-ABC"
        description={`Investment-Wissenszentrum der Fröhlich Vermögensberatung: Grundlagen, Anlageklassen, Orderarten, Kosten, Risiken und ein Börsen-ABC mit ${BOERSEN_ABC_COUNT} Begriffen — verständlich erklärt, ohne Renditeversprechen.`}
        path="/handeln"
      />

      {/* HERO */}
      <section className="border-b border-bank-border bg-bank-ink text-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <nav aria-label="Breadcrumb" className="text-[11px]">
            <ol className="flex flex-wrap items-center gap-1.5 font-mono uppercase tracking-[0.18em] text-white/50">
              <li><Link to="/" className="hover:text-bank-gold">Home</Link></li>
              <li aria-hidden>›</li>
              <li><Link to="/wissen" className="hover:text-bank-gold">Wissen</Link></li>
              <li aria-hidden>›</li>
              <li aria-current="page" className="text-bank-gold">Investieren lernen</li>
            </ol>
          </nav>

          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.28em] text-bank-gold">
            Investment-Wissenszentrum
          </p>
          <h1
            className="mt-6 max-w-4xl font-display text-4xl font-light leading-[1.05] tracking-[-0.02em] sm:text-5xl lg:text-6xl"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
          >
            Investieren, <span className="text-bank-gold italic font-light">verständlich.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-white/85 sm:text-[16.5px]">
            Grundlagen, Anlageklassen, Orderarten, Kosten und Risiken — kompakt aufbereitet.
            Ergänzt durch ein Börsen-ABC mit {BOERSEN_ABC_COUNT} Begriffen. Neutral formuliert,
            ohne Renditeversprechen und ohne Produkt­empfehlung.
          </p>

          <div className="mt-10 flex flex-wrap gap-2">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollToId(id)}
                data-testid={`hub-hero-jump-${id}`}
                className="group inline-flex items-center gap-1.5 border border-white/15 bg-white/[0.04] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/80 transition-colors hover:border-bank-gold/60 hover:bg-white/[0.08] hover:text-bank-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-gold/40"
              >
                <Icon size={11} strokeWidth={1.6} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* STICKY SUB-NAV */}
      <div className="sticky top-0 z-30 border-b border-bank-border bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <nav
            aria-label="Sektionen"
            className="no-scrollbar -mx-2 flex items-center gap-1 overflow-x-auto py-2.5"
          >
            {SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollToId(id)}
                data-testid={`hub-subnav-${id}`}
                className="shrink-0 whitespace-nowrap px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted transition-colors hover:text-bank-primary focus-visible:outline-none focus-visible:text-bank-primary"
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* GRUNDLAGEN */}
      <section id="grundlagen" className="border-b border-bank-border bg-white">
        <div className="mx-auto max-w-[1100px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <Eyebrow>Grundlagen</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight text-bank-text sm:text-[38px]">
            Was heißt investieren — und was nicht.
          </h2>
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="space-y-4 text-[15.5px] leading-relaxed text-bank-text-muted">
              <p>
                Wer investiert, überlässt Kapital einem Unternehmen, einem Staat oder einem
                Fonds — mit dem Ziel, dass daraus über Zeit ein Ertrag entsteht. Dieser Ertrag ist
                nie garantiert. Er ist die Kompensation für Risiko und für den Verzicht,
                gebundene Mittel anderweitig zu verwenden.
              </p>
              <p>
                Drei Größen bestimmen jedes Investment gemeinsam: <strong className="font-medium text-bank-text">Rendite</strong>,{' '}
                <strong className="font-medium text-bank-text">Risiko</strong> und{' '}
                <strong className="font-medium text-bank-text">Zeit</strong>. Wer eine dieser Größen
                vergisst, verliert das Gleichgewicht — meist zulasten der Rendite.
              </p>
              <p>
                Ein realistischer Anlagehorizont, eine schriftliche Strategie und eine ehrliche
                Einschätzung der eigenen Risikotragfähigkeit sind wichtiger als jede
                Einzelentscheidung im Jahr.
              </p>
            </div>
            <aside className="border border-bank-border bg-bank-bg p-6">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
                Merkspruch
              </p>
              <p className="mt-3 font-serif text-[19px] leading-snug text-bank-text">
                „Rendite ohne Risiko ist Marketing.<br />Risiko ohne Plan ist Zufall."
              </p>
              <div className="mt-6 h-px w-10 bg-bank-gold/50" aria-hidden />
              <p className="mt-4 text-[13.5px] leading-relaxed text-bank-text-muted">
                Diese Seite ersetzt keine individuelle Anlageberatung. Sie erklärt Begriffe und
                Mechanismen — Empfehlungen ergeben sich erst im persönlichen Gespräch.
              </p>
            </aside>
          </div>
        </div>
      </section>

      {/* ANLAGEKLASSEN */}
      <section id="anlageklassen" className="border-b border-bank-border bg-bank-bg">
        <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <Eyebrow>Anlageklassen</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight text-bank-text sm:text-[38px]">
            Die Bausteine kennen.
          </h2>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-bank-text-muted">
            Anlageklassen unterscheiden sich in Ertragsprofil, Schwankungsbreite und Rolle im
            Portfolio. Ausführliche Themenseiten liegen jeweils separat vor.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {ASSET_CLASSES.map((a) => (
              <article
                key={a.title}
                data-testid={`hub-asset-${a.title.toLowerCase().replace(/[^a-z]/g, '')}`}
                className="group flex flex-col justify-between border border-bank-border bg-white p-6 transition-colors hover:border-bank-gold/60"
              >
                <div>
                  <h3 className="font-serif text-[22px] leading-tight text-bank-text">{a.title}</h3>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-bank-text-muted">{a.body}</p>
                </div>
                <Link
                  to={a.href}
                  data-testid={`hub-asset-link-${a.title.toLowerCase().replace(/[^a-z]/g, '')}`}
                  className="mt-6 inline-flex w-fit items-center gap-1.5 border-b border-bank-primary pb-0.5 text-[12px] font-medium uppercase tracking-[0.16em] text-bank-primary transition-colors hover:text-bank-primary/80"
                >
                  {a.linkLabel}
                  <ArrowUpRight size={13} strokeWidth={1.7} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ORDERARTEN */}
      <section id="orderarten" className="border-b border-bank-border bg-white">
        <div className="mx-auto max-w-[1100px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <Eyebrow>Orderarten</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight text-bank-text sm:text-[38px]">
            Wie ein Auftrag zum Trade wird.
          </h2>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-bank-text-muted">
            Die Auswahl der Orderart entscheidet, ob und zu welchem Kurs ein Auftrag ausgeführt
            wird. Je nach Marktlage kann derselbe Titel sehr unterschiedlich abgewickelt werden.
          </p>

          <div className="mt-10 divide-y divide-bank-border border-y border-bank-border">
            {ORDER_TYPES.map((o, i) => (
              <div
                key={o.name}
                className="grid gap-4 py-8 sm:grid-cols-[auto_1fr] sm:gap-x-10"
                data-testid={`hub-order-${o.name.toLowerCase().replace(/[^a-z]/g, '')}`}
              >
                <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold sm:pt-2">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-serif text-[20px] leading-snug text-bank-text">{o.name}</h3>
                  <p className="mt-2 text-[14.5px] font-medium text-bank-text">{o.lead}</p>
                  <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-bank-text-muted">
                    {o.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KOSTEN & STEUERN */}
      <section id="kosten" className="border-b border-bank-border bg-bank-bg">
        <div className="mx-auto max-w-[1100px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <Eyebrow>Kosten &amp; Steuern</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight text-bank-text sm:text-[38px]">
            Was Rendite tatsächlich kostet.
          </h2>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-bank-text-muted">
            Kosten wirken über die Zeit exponentiell. Sie sind der einzige Portfoliohebel, den
            Anleger direkt beeinflussen können.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {COSTS.map((c, i) => (
              <div
                key={c.title}
                className="border border-bank-border bg-white p-6"
                data-testid={`hub-cost-${i}`}
              >
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-3 font-serif text-[18px] leading-snug text-bank-text">{c.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-bank-text-muted">{c.body}</p>
                {c.disclaimer && (
                  <p className="mt-4 border-t border-bank-border pt-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
                    Keine individuelle Steuerberatung
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RISIKEN */}
      <section id="risiken" className="border-b border-bank-border bg-white">
        <div className="mx-auto max-w-[1100px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <Eyebrow>Risiken &amp; Diversifikation</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight text-bank-text sm:text-[38px]">
            Was schiefgehen kann.
          </h2>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-bank-text-muted">
            Risiken sind kein Nebeneffekt — sie sind die Bedingung für Rendite. Wer sie kennt,
            kann sie bewusst tragen oder gezielt streuen.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {RISK_POINTS.map((r) => (
              <div key={r.title} className="border-l-2 border-bank-gold bg-bank-bg/60 py-4 pl-5 pr-4">
                <h3 className="font-serif text-[17px] leading-snug text-bank-text">{r.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-bank-text-muted">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BÖRSEN-ABC */}
      <section id="abc" className="border-b border-bank-border bg-bank-bg">
        <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <Eyebrow>Börsen-ABC</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight text-bank-text sm:text-[38px]">
            {BOERSEN_ABC_COUNT} Begriffe, kompakt erklärt.
          </h2>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-bank-text-muted">
            Kurz genug für den Alltag, präzise genug für eine erste Einordnung. Für Details
            weiterführende Themen­seiten und Grundlagenbeiträge im Wissen-Bereich.
          </p>

          {/* Suchleiste */}
          <div className="mt-10 border border-bank-border bg-white">
            <div className="relative flex items-center border-b border-bank-border">
              <Search
                size={16}
                strokeWidth={1.5}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-bank-text-muted"
              />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Begriff suchen — z. B. ETF, Dividende, Volatilität…"
                aria-label="Börsen-ABC durchsuchen"
                data-testid="abc-search-input"
                className="h-14 w-full border-0 bg-transparent pl-11 pr-12 font-serif text-[16px] text-bank-text placeholder:text-bank-text-muted/70 focus:outline-none focus:ring-0"
              />
              {(query || activeLetter !== 'all') && (
                <button
                  type="button"
                  onClick={clearSearch}
                  data-testid="abc-search-clear"
                  aria-label="Suche zurücksetzen"
                  className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center border border-bank-border bg-white text-bank-text-muted transition-colors hover:border-bank-gold/55 hover:text-bank-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
                >
                  <X size={14} strokeWidth={1.6} />
                </button>
              )}
            </div>

            {/* A-Z Navigation */}
            <div className="no-scrollbar flex items-center gap-1 overflow-x-auto px-3 py-3">
              <button
                type="button"
                onClick={() => setActiveLetter('all')}
                data-testid="abc-letter-all"
                aria-pressed={activeLetter === 'all'}
                className={cn(
                  'shrink-0 border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35',
                  activeLetter === 'all'
                    ? 'border-bank-ink bg-bank-ink text-white'
                    : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-gold/55 hover:text-bank-text',
                )}
              >
                Alle
              </button>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((L) => {
                const available = availableLetters.has(L);
                const active = activeLetter === L;
                return (
                  <button
                    key={L}
                    type="button"
                    disabled={!available}
                    onClick={() => setActiveLetter(active ? 'all' : L)}
                    data-testid={`abc-letter-${L}`}
                    aria-pressed={active}
                    className={cn(
                      'shrink-0 border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35',
                      !available && 'border-bank-border/40 bg-white/50 text-bank-text-muted/30 cursor-not-allowed',
                      available && !active && 'border-bank-border bg-white text-bank-text-muted hover:border-bank-gold/55 hover:text-bank-text',
                      available && active && 'border-bank-ink bg-bank-ink text-white',
                    )}
                  >
                    {L}
                  </button>
                );
              })}
            </div>

            <p className="border-t border-bank-border px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
              <span data-testid="abc-result-count" className="tabular-nums text-bank-text">
                {filteredTerms.length}
              </span>{' '}
              von <span className="tabular-nums">{BOERSEN_ABC_COUNT}</span> Begriffen
            </p>
          </div>

          {/* Ergebnisliste */}
          <div className="mt-10">
            {groupedTerms.length === 0 ? (
              <div
                className="border border-bank-border bg-white p-10 text-center"
                data-testid="abc-empty-state"
              >
                <p className="font-serif text-[19px] text-bank-text">Keine Treffer</p>
                <p className="mt-2 text-[14px] text-bank-text-muted">
                  Für „{query}" wurde nichts gefunden. Bitte anderen Begriff versuchen oder
                  Filter zurücksetzen.
                </p>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="mt-6 inline-flex items-center gap-1.5 border border-bank-primary px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bank-primary transition-colors hover:bg-bank-primary hover:text-white"
                  data-testid="abc-reset-btn"
                >
                  Filter zurücksetzen
                </button>
              </div>
            ) : (
              <div className="space-y-10">
                {groupedTerms.map(([letter, entries]) => (
                  <div key={letter} id={`abc-group-${letter}`}>
                    <div className="mb-4 flex items-baseline gap-4 border-b border-bank-border pb-3">
                      <span className="font-display text-[42px] font-light leading-none text-bank-gold">
                        {letter}
                      </span>
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
                        {entries.length} {entries.length === 1 ? 'Begriff' : 'Begriffe'}
                      </span>
                    </div>

                    <ul className="divide-y divide-bank-border border-y border-bank-border bg-white">
                      {entries.map((t) => {
                        const key = `${t.letter}-${t.term}`;
                        const open = openTerms.has(key);
                        return (
                          <li key={key} data-testid={`abc-item-${t.term.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                            <button
                              type="button"
                              onClick={() => toggleTerm(key)}
                              aria-expanded={open}
                              data-testid={`abc-toggle-${t.term.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                              className="group flex w-full items-start justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-bank-bg/40 focus-visible:outline-none focus-visible:bg-bank-bg/50"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                  <h3 className="font-serif text-[18px] leading-snug text-bank-text group-hover:text-bank-primary">
                                    {t.term}
                                  </h3>
                                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">
                                    {BOERSEN_ABC_CATEGORIES[t.category] || t.category}
                                  </span>
                                </div>
                                <p className="mt-1.5 text-[14px] leading-relaxed text-bank-text-muted">
                                  {t.short}
                                </p>
                              </div>
                              <ChevronDown
                                size={18}
                                strokeWidth={1.6}
                                className={cn(
                                  'mt-1 shrink-0 text-bank-text-muted transition-transform',
                                  open && 'rotate-180 text-bank-primary',
                                )}
                                aria-hidden
                              />
                            </button>
                            {open && (
                              <div
                                className="border-t border-bank-border bg-bank-bg/40 px-5 py-5"
                                data-testid={`abc-content-${t.term.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                              >
                                <p className="max-w-3xl text-[14.5px] leading-relaxed text-bank-text">
                                  {t.long}
                                </p>
                                {t.example && (
                                  <p className="mt-3 max-w-3xl border-l-2 border-bank-gold/60 pl-4 text-[13.5px] italic leading-relaxed text-bank-text-muted">
                                    Beispiel: {t.example}
                                  </p>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* HÄUFIGE FEHLER */}
      <section id="fehler" className="border-b border-bank-border bg-white">
        <div className="mx-auto max-w-[1100px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <Eyebrow>Häufige Fehler</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight text-bank-text sm:text-[38px]">
            Was Anfängern immer wieder passiert.
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {COMMON_MISTAKES.map((m, i) => (
              <div
                key={m.title}
                className="border border-bank-border bg-white p-6"
                data-testid={`hub-mistake-${i}`}
              >
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-serif text-[18px] leading-snug text-bank-text">{m.title}</h3>
                </div>
                <p className="mt-3 text-[14.5px] leading-relaxed text-bank-text-muted">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WISSEN VERTIEFEN — kuratiert, editorial, max 3 Ziele.
          Steht bewusst zwischen "Häufige Fehler" und dem finalen CTA,
          damit die inhaltlich reichhaltige Anlageklassen-Section oben
          erhalten bleibt und dieser Block als klarer nächster Schritt
          in das breitere Wissensnetz führt. */}
      <RelatedKnowledge
        items={getRelatedKnowledge('handeln')}
        tone="muted"
        testId="handeln-related"
      />

      {/* CTA & DISCLAIMER */}
      <section className="bg-bank-ink text-white">
        <div className="mx-auto max-w-[1100px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-gold">
            Persönliches Gespräch
          </p>
          <h2
            className="mt-4 max-w-3xl font-display text-3xl font-light leading-[1.1] sm:text-[42px]"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
          >
            Wissen ist der Anfang.<br />
            <span className="text-bank-gold italic">Der Plan entsteht im Gespräch.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-white/80">
            Diese Seite ersetzt keine individuelle Anlageberatung. Für eine Einschätzung Ihrer
            Situation, Ziele und Erfahrungen ist ein persönliches Gespräch erforderlich —
            selbstverständlich unverbindlich.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/contact"
              data-testid="hub-cta-contact"
              className="inline-flex items-center gap-2 bg-bank-gold px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-bank-ink transition-colors hover:bg-bank-gold/90"
            >
              Gespräch vereinbaren
              <ArrowUpRight size={13} strokeWidth={1.7} />
            </Link>
            <Link
              to="/wissen"
              data-testid="hub-cta-wissen"
              className="inline-flex items-center gap-2 border border-white/25 px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-white transition-colors hover:border-bank-gold hover:text-bank-gold"
            >
              Weitere Wissensbeiträge
            </Link>
            <Link
              to="/themen"
              data-testid="hub-cta-themen"
              className="inline-flex items-center gap-2 border border-white/25 px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-white transition-colors hover:border-bank-gold hover:text-bank-gold"
            >
              Themen im Fokus
            </Link>
          </div>
          <p className="mt-10 border-t border-white/10 pt-6 max-w-3xl text-[12.5px] leading-relaxed text-white/55">
            Keine Anlage-, Rechts- oder Steuerberatung. Kapitalanlagen sind mit Risiken bis hin
            zum Totalverlust verbunden. Frühere Wertentwicklungen sind kein verlässlicher
            Indikator für die zukünftige Wertentwicklung. Alle Angaben nach bestem Wissen,
            jedoch ohne Gewähr.
          </p>
        </div>
      </section>
    </div>
  );
};

export default HandelnHub;
