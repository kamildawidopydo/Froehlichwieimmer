import { memo } from 'react';
import BrandLogo from '@/components/BrandLogo';
import { Link } from 'react-router-dom';
import {
  BadgePercent,
  BarChart3,
  BookOpen,
  Check,
  CircleGauge,
  Clock,
  Headphones,
  Landmark,
  Package,
  PieChart,
  Receipt,
  Scale,
  Target,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import siteContact from '@/data/siteContact';
import {
  spezialAifEditorialClosingLine,
  spezialAifEditorialIssuerLine,
  spezialAifEditorialStand,
  spezialAifKeyFacts,
  spezialAifKennzahlenAnchorId,
  spezialAifLegalNotice,
  spezialAifRiskScaleLevel,
  spezialAifRiskScaleSrHint,
} from '@/data/spezialAifContent';
import {
  spezialAifPibCompactSections,
  spezialAifPibCostRows,
  spezialAifPibGoalsLead,
  spezialAifPibGoalsImageUrl,
  spezialAifPibGoalsImageAlt,
  spezialAifPibMeta,
  spezialAifPibRechtsHinweis,
  spezialAifPibReturnBand,
  spezialAifPibRiskFootnote,
  spezialAifPibRisks,
  spezialAifPibOpportunities,
  spezialAifPibStrategyChecks,
  spezialAifPibTargetChecks,
  spezialAifPibTargetGroupLead,
  spezialAifPibTermLiquidityRows,
} from '@/data/spezialAifPibContent';

/** PIB factsheet — navy disc + white icon (print brochure tone). */
const pibNavyIconDisc =
  'flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-full bg-bank-ink text-white shadow-[0_2px_12px_rgba(7,18,34,0.2)] ring-1 ring-bank-accent/30 dark:ring-bank-accent/40';

const pibCardClass =
  'relative overflow-hidden rounded-2xl border border-bank-border/90 bg-white p-6 shadow-[0_1px_0_rgb(0_0_0/0.04),0_12px_40px_-24px_rgb(7_18_34/0.12)] dark:border-bank-border dark:bg-bank-surface sm:p-8';

const pibCardSheen =
  'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-accent/35 to-transparent';

const pibCompactCardClass =
  'relative flex flex-col overflow-hidden rounded-2xl border border-bank-border/90 bg-white p-6 shadow-[0_1px_0_rgb(0_0_0/0.04),0_10px_32px_-20px_rgb(7_18_34/0.1)] dark:border-bank-border dark:bg-bank-surface';

const pibCompactIconDisc =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bank-ink text-white shadow-sm ring-1 ring-bank-accent/25';

function PibSectionHeader({ n, title, glyph: Glyph }) {
  const Svg = typeof Glyph === 'function' ? Glyph : Landmark;
  return (
    <div className="mb-5 flex items-start gap-4">
      <span className={pibNavyIconDisc} aria-hidden>
        <Svg className="h-5 w-5" strokeWidth={LUCIDE_STROKE} />
      </span>
      <div className="min-w-0 border-l border-bank-accent/20 pl-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-bank-text-muted">§ {n}</p>
        <h3 className="mt-1.5 font-display text-xl font-light leading-snug tracking-tight text-bank-text sm:text-[1.35rem]">{title}</h3>
      </div>
    </div>
  );
}

const PibFactTable = memo(function PibFactTable({ rows, id }) {
  return (
    <div
      id={id}
      className={cn(
        'min-w-0 max-w-full rounded-xl border border-bank-border/90 bg-bank-bg/70 dark:bg-bank-surface-elev/50',
        id && 'scroll-mt-28',
      )}
    >
      <table className="block w-full text-left text-[13px] leading-snug sm:table">
        <tbody className="block sm:table-row-group [&_tr:nth-child(even)]:bg-bank-primary/[0.035] dark:[&_tr:nth-child(even)]:bg-white/[0.03]">
          {rows.map((row) => (
            <tr
              key={row.label}
              className="block border-b border-bank-border/70 last:border-b-0 sm:table-row"
            >
              <th
                scope="row"
                className="block w-full px-3 pb-1 pt-3 text-[12px] font-semibold text-bank-text sm:table-cell sm:w-[min(42%,14rem)] sm:px-5 sm:py-3.5 sm:text-[12.5px]"
              >
                {row.label}
              </th>
              <td className="block w-full break-words px-3 pb-3 pt-0.5 text-[12.5px] leading-relaxed text-bank-text-muted sm:table-cell sm:px-5 sm:py-3.5 sm:text-[13px]">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
PibFactTable.displayName = 'PibFactTable';

const PibDataTable = memo(function PibDataTable({ rows, id }) {
  return <PibFactTable rows={rows} id={id} />;
});
PibDataTable.displayName = 'PibDataTable';

const PibTermTable = memo(function PibTermTable({ rows }) {
  return <PibFactTable rows={rows} />;
});
PibTermTable.displayName = 'PibTermTable';

const RiskIndicatorBar = memo(function RiskIndicatorBar() {
  const active = spezialAifRiskScaleLevel;
  return (
    <div className="rounded-xl bg-bank-bg/30 p-1 dark:bg-transparent sm:p-0" role="group" aria-label="Risikoindikator Skala 1 bis 7">
      <p className="text-[12.5px] leading-relaxed text-bank-text-muted">{spezialAifPibRiskFootnote}</p>
      <p className="sr-only">{spezialAifRiskScaleSrHint}</p>
      <div className="mt-6">
        <ol className="flex list-none gap-1 p-0 sm:gap-1.5" aria-label={`Risikoskala 1 bis 7, hervorgehoben: Stufe ${active}`}>
          {Array.from({ length: 7 }, (_, i) => {
            const n = i + 1;
            const isActive = n === active;
            return (
              <li key={n} className="min-w-0 flex-1" aria-current={isActive ? 'true' : undefined}>
                <span className="sr-only">
                  Stufe {n}
                  {isActive ? ' (aktuell)' : ''}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'block rounded-sm transition-[height,box-shadow] duration-200',
                    isActive ? 'h-4 sm:h-[1.125rem]' : 'h-2.5 sm:h-3',
                    isActive
                      ? 'bg-gradient-to-b from-bank-gold to-bank-accent shadow-[0_0_0_2px_rgb(var(--bank-gold)/0.35)]'
                      : 'bg-bank-border/90 dark:bg-bank-border'
                  )}
                />
              </li>
            );
          })}
        </ol>
        <div
          className="mt-2.5 flex justify-between text-[10px] font-medium tabular-nums text-bank-text-muted sm:text-[10.5px]"
          aria-hidden
        >
          {Array.from({ length: 7 }, (_, i) => {
            const n = i + 1;
            return (
              <span key={n} className={cn('w-0 min-w-0 flex-1 text-center', n === active && 'font-semibold text-bank-text')}>
                {n}
              </span>
            );
          })}
        </div>
        <div className="mt-3 flex flex-col gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-bank-text-muted sm:flex-row sm:justify-between sm:gap-3 sm:text-[10.5px] sm:tracking-[0.1em]" aria-hidden>
          <span>1 · geringeres Risiko</span>
          <span>7 · höheres Risiko</span>
        </div>
        <p className="mt-4 text-center text-[13px] text-bank-text">
          Hervorgehobene Stufe:{' '}
          <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-md border border-bank-accent/55 bg-bank-primary px-2.5 py-1 text-[13px] font-semibold tabular-nums text-white shadow-sm">
            {active}
          </span>
        </p>
      </div>
    </div>
  );
});
RiskIndicatorBar.displayName = 'RiskIndicatorBar';

const ReturnTargetDonut = memo(function ReturnTargetDonut() {
  const { label, from, to, unit, footnote } = spezialAifPibReturnBand;
  const ring = `conic-gradient(
    rgb(var(--bank-gold)) 0deg 120deg,
    rgb(var(--bank-accent)) 120deg 240deg,
    rgb(var(--bank-primary)) 240deg 360deg
  )`;
  return (
    <figure className="flex min-w-0 flex-col items-center gap-8 overflow-hidden sm:flex-row sm:items-center sm:gap-12" aria-labelledby="pib-return-heading">
      <div className="relative shrink-0 overflow-visible">
        <div
          className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-bank-accent/25 via-transparent to-bank-gold/22 blur-sm sm:-inset-1"
          aria-hidden
        />
        <div
          className="relative h-48 w-48 rounded-full p-[11px] shadow-editorial-md ring-1 ring-bank-accent/25 sm:h-52 sm:w-52"
          style={{ background: ring }}
          role="presentation"
          aria-hidden
        >
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white px-3 text-center shadow-inner dark:bg-bank-surface">
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-bank-text-muted">{label}</span>
            <p id="pib-return-heading" className="mt-2 font-display text-[clamp(1.1rem,3.2vw,1.45rem)] font-light leading-tight tracking-tight text-bank-text">
              {from} % – {to} %
            </p>
            <p className="mt-1 text-[11px] font-medium text-bank-text-muted">{unit}*</p>
          </div>
        </div>
      </div>
      <figcaption className="max-w-md text-[13px] leading-relaxed text-bank-text-muted">
        <span className="font-medium text-bank-text">*</span> {footnote}
      </figcaption>
    </figure>
  );
});
ReturnTargetDonut.displayName = 'ReturnTargetDonut';

const iconByCompact = [BarChart3, Receipt, Headphones, BookOpen];

export const SpezialAifPibCore = memo(function SpezialAifPibCore() {
  return (
    <section
      id="spezial-aif-pib"
      className="scroll-mt-24 overflow-x-clip border-b border-bank-border bg-[linear-gradient(180deg,rgb(var(--bank-bg))_0%,rgb(var(--bank-surface-elev)/0.45)_42%,rgb(var(--bank-bg))_100%)] py-16 dark:bg-[linear-gradient(180deg,rgb(var(--bank-bg))_0%,rgb(var(--bank-surface-elev)/0.12)_45%,rgb(var(--bank-bg))_100%)] sm:py-20 lg:py-24"
      aria-label="Produktinformationsblatt — Kerndaten"
    >
      <div className="mx-auto min-w-0 max-w-[1440px] border-l border-bank-accent/[0.12] px-5 pl-4 sm:px-8 sm:pl-6 lg:px-12 lg:pl-10">
        <header className="mb-12 max-w-3xl pb-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-px flex-1 max-w-[4.5rem] bg-gradient-to-r from-transparent to-bank-border" aria-hidden />
            <p className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-bank-text-muted">Kerndaten</p>
            <span className="h-px flex-1 bg-bank-border/90" aria-hidden />
          </div>
          <h2 className="font-display text-display-sm font-light tracking-tight text-bank-text">{spezialAifPibMeta.documentTitle}</h2>
          <p className="mt-4 max-w-2xl text-[14px] leading-[1.75] text-bank-text-muted">{spezialAifPibMeta.intro}</p>
        </header>

        <div className="grid min-w-0 gap-7 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-9">
          {/* §1 Produkt */}
          <article className={cn(pibCardClass, 'min-w-0')}>
            <span className={pibCardSheen} aria-hidden />
            <PibSectionHeader n={1} title="Produkt" glyph={Package} />
            <PibDataTable rows={spezialAifKeyFacts} id={spezialAifKennzahlenAnchorId} />
          </article>

          {/* §2 Ziele & Strategie */}
          <article className={cn(pibCardClass, 'min-w-0')}>
            <span className={pibCardSheen} aria-hidden />
            <PibSectionHeader n={2} title="Ziele und Anlagestrategie" glyph={Target} />
            <p className="text-[13px] leading-relaxed text-bank-text-muted">{spezialAifPibGoalsLead}</p>
            <ul className="mt-5 space-y-2.5">
              {spezialAifPibStrategyChecks.map((line) => (
                <li key={line} className="flex gap-2.5 text-[13px] leading-snug text-bank-text">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-bank-accent" strokeWidth={2.25} aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <figure className="relative mt-8 aspect-[16/10] overflow-hidden rounded-xl border border-bank-border/80 bg-bank-bg/50 sm:aspect-[2/1] dark:bg-bank-surface-elev/40">
              <img
                src={spezialAifPibGoalsImageUrl}
                alt={spezialAifPibGoalsImageAlt}
                className="h-full w-full object-cover object-[50%_42%]"
                loading="lazy"
                decoding="async"
                sizes="(max-width: 1024px) 100vw, min(640px, 50vw)"
              />
            </figure>
          </article>

          {/* §3 Zielgruppe */}
          <article className={cn(pibCardClass, 'min-w-0')}>
            <span className={pibCardSheen} aria-hidden />
            <PibSectionHeader n={3} title="Anlegerzielgruppe" glyph={Users} />
            <p className="text-[13px] leading-relaxed text-bank-text-muted">{spezialAifPibTargetGroupLead}</p>
            <ul className="mt-5 space-y-2.5">
              {spezialAifPibTargetChecks.map((line) => (
                <li key={line} className="flex gap-2.5 text-[13px] leading-snug text-bank-text">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-bank-accent" strokeWidth={2.25} aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </article>

          {/* §4 Laufzeit & Liquidität */}
          <article className={cn(pibCardClass, 'min-w-0')}>
            <span className={pibCardSheen} aria-hidden />
            <PibSectionHeader n={4} title="Laufzeit und Liquidität" glyph={Clock} />
            <PibTermTable rows={spezialAifPibTermLiquidityRows} />
          </article>

          {/* §5 Risiko */}
          <article className={cn(pibCardClass, 'min-w-0 lg:col-span-1')}>
            <span className={pibCardSheen} aria-hidden />
            <PibSectionHeader n={5} title="Risikoindikator" glyph={CircleGauge} />
            <RiskIndicatorBar />
          </article>

          {/* §6 Chancen & Risiken */}
          <article className={cn(pibCardClass, 'min-w-0')}>
            <span className={pibCardSheen} aria-hidden />
            <PibSectionHeader n={6} title="Chancen und Risiken" glyph={Scale} />
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bank-primary">Chancen</p>
                <ul className="mt-3 space-y-2">
                  {spezialAifPibOpportunities.map((line) => (
                    <li key={line} className="flex gap-2 text-[13px] leading-snug text-bank-text">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-bank-primary" strokeWidth={2.25} aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bank-gold">Risiken</p>
                <ul className="mt-3 space-y-2">
                  {spezialAifPibRisks.map((line) => (
                    <li key={line} className="flex gap-2 text-[13px] leading-snug text-bank-text">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-bank-gold" strokeWidth={2.25} aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          {/* §7 Kosten */}
          <article className={cn(pibCardClass, 'min-w-0')}>
            <span className={pibCardSheen} aria-hidden />
            <PibSectionHeader n={7} title="Kosten" glyph={BadgePercent} />
            <PibTermTable rows={spezialAifPibCostRows} />
          </article>

          {/* §8 Renditeerwartung */}
          <article className={cn(pibCardClass, 'min-w-0 lg:col-span-2')}>
            <span className={pibCardSheen} aria-hidden />
            <PibSectionHeader n={8} title="Renditeerwartung" glyph={PieChart} />
            <ReturnTargetDonut />
          </article>
        </div>
      </div>
    </section>
  );
});
SpezialAifPibCore.displayName = 'SpezialAifPibCore';

export const SpezialAifPibFooterBand = memo(function SpezialAifPibFooterBand() {
  return (
    <section className="border-b border-bank-border bg-bank-bg py-14 dark:bg-bank-surface-elev/30 sm:py-16 lg:py-20" aria-label="Weitere Pflichtangaben">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {spezialAifPibCompactSections.map((block, i) => {
            const Icon = iconByCompact[i] || Landmark;
            return (
              <article key={block.n} className={pibCompactCardClass}>
                <span className={pibCardSheen} aria-hidden />
                <div className="mb-3 flex items-start gap-3">
                  <span className={pibCompactIconDisc} aria-hidden>
                    <Icon className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                  </span>
                  <p className="min-w-0 pt-1 font-mono text-[10px] font-semibold uppercase leading-snug tracking-[0.18em] text-bank-text-muted">
                    § {block.n} · {block.title}
                  </p>
                </div>
                <p className="flex-1 text-[12.5px] leading-relaxed text-bank-text-muted">{block.body}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-12 grid gap-8 border-t border-bank-border/80 pt-10 lg:grid-cols-2 lg:gap-12">
          <div className="min-w-0">
            <h3 className="inline-block border-b border-bank-accent/40 pb-1.5 font-display text-lg font-light text-bank-text sm:text-xl">
              Wichtiger Hinweis
            </h3>
            <p className="mt-4 text-[12.5px] leading-relaxed text-bank-text-muted sm:text-[13px]">{spezialAifLegalNotice}</p>
          </div>
          <div className="min-w-0">
            <h3 className="inline-block border-b border-bank-accent/40 pb-1.5 font-display text-lg font-light text-bank-text sm:text-xl">
              Rechtshinweis
            </h3>
            <p className="mt-4 text-[12.5px] leading-relaxed text-bank-text-muted sm:text-[13px]">{spezialAifPibRechtsHinweis}</p>
          </div>
        </div>

        <footer className="mt-10 flex flex-col gap-6 border-t border-bank-border/70 pt-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-2 text-[11.5px] leading-relaxed text-bank-text-muted sm:text-[12px]">
            <p>
              <span className="font-medium text-bank-text">
                {spezialAifPibMeta.standLabel}: {spezialAifEditorialStand}
              </span>{' '}
              — {spezialAifEditorialIssuerLine}
            </p>
            <p>
              <span className="font-medium text-bank-text">Beschwerden:</span>{' '}
              <a
                href={`mailto:${siteContact.email}`}
                className="text-bank-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/35 focus-visible:ring-offset-2"
              >
                {siteContact.email}
              </a>
              {', '}
              {siteContact.street}, {siteContact.postalCity}
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
              <Link
                to="/legal/impressum"
                className="font-medium text-bank-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/35 focus-visible:ring-offset-2"
              >
                Impressum &amp; Rechtliches
              </Link>
              <Link
                to="/contact"
                className="font-medium text-bank-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/35 focus-visible:ring-offset-2"
              >
                Kontakt
              </Link>
              <a
                href={`#${spezialAifKennzahlenAnchorId}`}
                className="font-medium text-bank-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/35 focus-visible:ring-offset-2"
              >
                Zur Produktübersicht (§1)
              </a>
            </p>
            <p className="pt-3 text-[11.5px] leading-relaxed text-bank-text-muted sm:text-[12px]">{spezialAifEditorialClosingLine}</p>
          </div>
          <div className="shrink-0 self-start sm:self-end">
            <BrandLogo
              imgClassName="h-10 w-auto opacity-90 dark:opacity-95"
              width={140}
              height={48}
              loading="lazy"
              decoding="async"
            />
            <span className="sr-only">Kapitalmitte</span>
          </div>
        </footer>
      </div>
    </section>
  );
});
SpezialAifPibFooterBand.displayName = 'SpezialAifPibFooterBand';
