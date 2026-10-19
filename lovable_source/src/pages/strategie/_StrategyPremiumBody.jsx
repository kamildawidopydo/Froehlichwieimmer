import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Book,
  Briefcase,
  Check,
  ChevronDown,
  Clock,
  FileText,
  Layers,
  Leaf,
  Percent,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import StrategyQuickFacts from './_StrategyQuickFacts';
import StrategySectionNav from './_StrategySectionNav';
import StrategySelfCheck from './_StrategySelfCheck';
import StrategyComparison from './_StrategyComparison';
import StrategieCta from './_StrategieCta';
import {
  StrategyKeyTakeaways,
  ReadingTimeBadge,
  StrategyTerms,
  StrategyDeepLearn,
  StrategyNewsSection,
  StrategyConversationQuestions,
  StrategyReportDownload,
  computeReadingMinutes,
} from './_StrategyKnowledgeCenter';

const ICONS = {
  'alert-triangle': AlertTriangle,
  award: Award,
  book: Book,
  briefcase: Briefcase,
  clock: Clock,
  'file-text': FileText,
  layers: Layers,
  leaf: Leaf,
  percent: Percent,
  shield: Shield,
  target: Target,
  'trending-down': TrendingDown,
  'trending-up': TrendingUp,
};

const SectionHeading = ({ eyebrow, title }) => (
  <div>
    <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">{eyebrow}</p>
    <h2 className="mt-2 font-serif text-[26px] leading-tight text-bank-text sm:text-[32px]">{title}</h2>
  </div>
);

const FaqItem = ({ q, a, idx }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border-b border-bank-border py-4" data-testid={`strategie-faq-${idx}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <span className="font-serif text-[16px] text-bank-text">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-bank-primary transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.8}
          aria-hidden
        />
      </button>
      {open && <p className="mt-3 text-[13.5px] leading-relaxed text-bank-text-muted">{a}</p>}
    </div>
  );
};

const StrategyPremiumBody = ({ category, topic, premium }) => {
  const readingMinutes = React.useMemo(() => computeReadingMinutes(premium), [premium]);

  const navItems = [
    { id: 'ueberblick', label: 'Überblick' },
    { id: 'key-takeaways', label: 'Das Wichtigste' },
    { id: 'kurz-erklaert', label: 'Kurz erklärt' },
    { id: 'fuer-wen', label: 'Für wen?' },
    { id: 'funktionsweise', label: 'Funktionsweise' },
    { id: 'wichtige-aspekte', label: 'Wichtige Aspekte' },
    { id: 'beispiel', label: 'Beispiel' },
    { id: 'vorteile-und-punkte', label: 'Vorteile & zu beachten' },
    { id: 'wichtige-begriffe', label: 'Begriffe' },
    { id: 'wissen-vertiefen', label: 'Wissen vertiefen' },
    { id: 'aktuelle-einblicke', label: 'Aktuelle Einblicke' },
    { id: 'self-check', label: 'Self-Check' },
    { id: 'fragen-fuer-gespraech', label: 'Fragen fürs Gespräch' },
    { id: 'vergleich', label: 'Vergleich' },
    { id: 'faq', label: 'FAQ' },
    { id: 'merkblatt', label: 'Merkblatt' },
    { id: 'verwandte-themen', label: 'Verwandte Themen' },
  ];

  return (
    <div className="mt-8 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-x-12 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Seiten-Navigation">
        <div className="hidden lg:block">
          <p className="mb-3 text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Auf dieser Seite</p>
        </div>
        <StrategySectionNav items={navItems} />
      </aside>

      <div className="min-w-0">
        {/* Reading time badge */}
        <div className="mb-2">
          <ReadingTimeBadge minutes={readingMinutes} />
        </div>

        {/* Key Takeaways — direkt nach dem Hero */}
        <StrategyKeyTakeaways items={premium.keyTakeaways || []} />

        {/* Überblick / Summary */}
        <section id="ueberblick" className="mt-16 scroll-mt-24">
          <SectionHeading eyebrow="Überblick" title="Kurzfassung" />
          <p className="mt-4 text-[15.5px] leading-relaxed text-bank-text-muted">{premium.summary}</p>
          <StrategyQuickFacts items={premium.quickFacts} />
        </section>

        <section id="kurz-erklaert" className="mt-16 scroll-mt-24">
          <SectionHeading eyebrow="Kurz erklärt" title="Die Grundidee in wenigen Punkten" />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {premium.shortExplanation.map((item, i) => (
              <div key={i} className="rounded-xl border border-bank-border bg-white p-5 sm:p-6" data-testid={`strategie-short-${i}`}>
                <p className="font-serif text-[16px] leading-snug text-bank-text">{item.title}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-bank-text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="fuer-wen" className="mt-16 scroll-mt-24">
          <SectionHeading eyebrow="Für wen?" title="Für wen kann das Thema interessant sein?" />
          <p className="mt-4 text-[14.5px] leading-relaxed text-bank-text-muted">{premium.suitableFor.intro}</p>
          <ul className="mt-4 space-y-2.5">
            {premium.suitableFor.points.map((p, i) => (
              <li key={i} className="flex items-start gap-3">
                <span aria-hidden className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-bank-primary/25 bg-bank-primary/[0.06] text-bank-primary">
                  <Check className="h-3 w-3" strokeWidth={2.4} />
                </span>
                <span className="text-[14.5px] leading-relaxed text-bank-text">{p}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12.5px] italic text-bank-text-muted">
            Hinweis: keine individuelle Empfehlung, sondern eine allgemeine Einordnung.
          </p>
        </section>

        <section id="funktionsweise" className="mt-16 scroll-mt-24">
          <SectionHeading eyebrow="Funktionsweise" title="Wie funktioniert das in der Praxis?" />
          <ol className="mt-6 space-y-4">
            {premium.howItWorks.map((step, i) => (
              <li key={i} className="flex items-start gap-4" data-testid={`strategie-step-${i}`}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-bank-primary/30 bg-white font-mono text-[13px] font-semibold text-bank-primary">
                  {i + 1}
                </span>
                <p className="flex-1 pt-1 text-[14.5px] leading-relaxed text-bank-text">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="wichtige-aspekte" className="mt-16 scroll-mt-24">
          <SectionHeading eyebrow="Wichtige Aspekte" title="Was Sie beim Thema im Blick haben sollten" />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {premium.aspects.map((a, i) => {
              const Icon = ICONS[a.iconName] || Check;
              return (
                <div key={i} className="rounded-xl border border-bank-border bg-white p-5 sm:p-6" data-testid={`strategie-aspect-${i}`}>
                  <div className="flex items-start gap-3">
                    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-bank-primary/20 bg-bank-primary/[0.06] text-bank-primary">
                      <Icon className="h-4 w-4" strokeWidth={1.7} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-serif text-[15.5px] leading-snug text-bank-text">{a.title}</p>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-bank-text-muted">{a.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="beispiel" className="mt-16 scroll-mt-24">
          <SectionHeading eyebrow="Beispiel" title={premium.example.title} />
          <div className="mt-4 rounded-2xl border border-bank-border bg-bank-primary/[0.03] p-5 sm:p-7">
            <p className="text-[15px] leading-relaxed text-bank-text">{premium.example.body}</p>
            <p className="mt-4 text-[12px] italic text-bank-text-muted">{premium.example.disclaimer}</p>
          </div>
        </section>

        <section id="vorteile-und-punkte" className="mt-16 scroll-mt-24">
          <SectionHeading eyebrow="Vorteile & zu beachten" title="Mögliche Vorteile — und Punkte, die man abwägen sollte" />
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-bank-border bg-white p-5 sm:p-6" data-testid="strategie-advantages">
              <p className="font-serif text-[15.5px] text-bank-text">Mögliche Vorteile</p>
              <ul className="mt-3 space-y-2.5">
                {premium.advantages.map((a, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-bank-text-muted">
                    <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bank-primary" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-bank-border bg-white p-5 sm:p-6" data-testid="strategie-considerations">
              <p className="font-serif text-[15.5px] text-bank-text">Zu beachten</p>
              <ul className="mt-3 space-y-2.5">
                {premium.considerations.map((c, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-bank-text-muted">
                    <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bank-text-muted/50" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Knowledge Center: Terms + Deep Learn */}
        <StrategyTerms items={premium.terms || []} />
        <StrategyDeepLearn items={premium.deepLearn || []} />

        {/* News dynamisch aus /api/content/news */}
        <StrategyNewsSection
          topicSlug={topic.slug}
          keywords={premium.newsKeywords || []}
          topicTitle={topic.title}
        />

        <section id="haeufige-fehler" className="mt-16 scroll-mt-24">
          <SectionHeading eyebrow="Häufige Fehler" title="Woran viele Anleger scheitern" />
          <ul className="mt-6 space-y-3">
            {premium.mistakes.map((m, i) => (
              <li key={i} data-testid={`strategie-mistake-${i}`} className="flex items-start gap-3 rounded-xl border border-bank-border bg-white p-4">
                <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-bank-primary/25 bg-bank-primary/[0.05] font-mono text-[11px] font-semibold text-bank-primary">
                  {i + 1}
                </span>
                <p className="text-[14px] leading-relaxed text-bank-text">{m}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="self-check" className="mt-16 scroll-mt-24">
          <SectionHeading eyebrow="Self-Check" title="Was ist für Sie persönlich wichtig?" />
          <div className="mt-6">
            <StrategySelfCheck question={premium.selfCheck.question} options={premium.selfCheck.options} summary={premium.selfCheck.summary} />
          </div>
        </section>

        {/* Fragen fürs Gespräch — direkt nach Self-Check */}
        <StrategyConversationQuestions items={premium.conversationQuestions || []} />

        <section id="vergleich" className="mt-16 scroll-mt-24">
          <SectionHeading eyebrow="Vergleich" title={`${premium.comparison.leftTitle} vs. ${premium.comparison.rightTitle}`} />
          <p className="mt-3 text-[13.5px] text-bank-text-muted">
            Beide Ansätze haben ihre Berechtigung — Ziel des Vergleichs ist Klarheit, kein Ranking.
          </p>
          <div className="mt-6">
            <StrategyComparison leftTitle={premium.comparison.leftTitle} rightTitle={premium.comparison.rightTitle} rows={premium.comparison.rows} />
          </div>
        </section>

        {premium.faqs && premium.faqs.length > 0 ? (
          <section id="faq" className="mt-16 scroll-mt-24" aria-label="Häufige Fragen">
            <SectionHeading eyebrow="FAQ" title="Häufige Fragen" />
            <div className="mt-4 border-t border-bank-border">
              {premium.faqs.map((f, i) => <FaqItem key={i} idx={i} q={f.q} a={f.a} />)}
            </div>
          </section>
        ) : null}

        {/* Merkblatt-Download */}
        <StrategyReportDownload category={category} topic={topic} premium={premium} />

        {/* CTA */}
        <StrategieCta topicTitle={topic.title} topicSlug={topic.slug} categorySlug={category.slug} />

        <section id="verwandte-themen" className="mt-16 scroll-mt-24">
          <SectionHeading eyebrow="Verwandte Themen" title="Weiterlesen" />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {premium.related.map((r) => (
              <Link
                key={r.path}
                to={r.path}
                data-testid={`strategie-related-${r.path.split('/').pop()}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-bank-border bg-white p-4 transition-colors hover:border-bank-primary/40 hover:bg-bank-primary/[0.03]"
              >
                <span className="font-serif text-[15px] text-bank-text">{r.label}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-bank-primary transition-transform group-hover:translate-x-0.5" strokeWidth={1.6} aria-hidden />
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-16 text-[12px] italic leading-relaxed text-bank-text-muted" data-testid="strategie-disclaimer">
          Die Inhalte dienen der allgemeinen Information und ersetzen keine individuelle Anlage-, Steuer- oder Rechtsberatung.
        </p>
      </div>
    </div>
  );
};

export default StrategyPremiumBody;
