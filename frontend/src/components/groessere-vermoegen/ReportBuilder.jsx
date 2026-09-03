import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, FileText, Printer, RefreshCw, X } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import { Button } from '@/components/ui/button';

/**
 * Session 80.87 · Phase 3 „Größere Vermögen" — Vermögensreport (Preview + Print/PDF)
 * ------------------------------------------------------------------
 * Kein neuer Backend-Endpoint. Kein Screenshot-PDF. Der Report wird
 * strukturiert als HTML gerendert und via `window.print()` als
 * Vektor-PDF exportiert. Snapshot wird beim Klick auf „Report erstellen"
 * eingefroren — spätere UI-Änderungen wirken NICHT rückwirkend, bis
 * der Nutzer bewusst „Report aktualisieren" drückt.
 */

const EURO = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const PCT = (v) => `${(Math.round((Number(v) || 0) * 10) / 10).toLocaleString('de-DE')} %`;

const CATEGORY_ORDER = [
  { key: 'liquid',      label: 'Liquidität' },
  { key: 'verzinslich', label: 'Verzinsliche Anlagen' },
  { key: 'wertpapiere', label: 'Wertpapiere' },
  { key: 'sonstiges',   label: 'Sonstiges / nicht zugeordnet' },
];

const DISCLAIMER = 'Dieser Report dient ausschließlich der strukturierten Darstellung Ihrer Angaben und der Vorbereitung eines persönlichen Gesprächs. Er stellt keine individuelle Anlageberatung, Anlageempfehlung oder Garantie zukünftiger Entwicklungen dar.';

/** Robuste Style-Injektion für Print — nur bei geöffnetem Report aktiv. */
function usePrintIsolation(active) {
  useEffect(() => {
    if (!active) return;
    const style = document.createElement('style');
    style.setAttribute('data-report-print', 'true');
    style.textContent = `
      @media print {
        @page { size: A4; margin: 18mm 16mm 20mm 16mm; }
        html, body { background: #fff !important; }
        body * { visibility: hidden !important; }
        [data-report-root], [data-report-root] * { visibility: visible !important; }
        [data-report-root] { position: absolute; inset: 0; margin: 0; padding: 0; }
        [data-report-root] [data-print-hide] { display: none !important; }
        [data-report-root] .report-page { page-break-after: always; break-after: page; }
        [data-report-root] .report-page:last-child { page-break-after: auto; }
        [data-report-root] .avoid-break { page-break-inside: avoid; break-inside: avoid; }
      }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, [active]);
}

function buildSnapshot({ phase1, phase2, struct, ladder, scenarios, activeScenario, clusterHints, liquidHints, zinsGroups, zinsLoadedAt }) {
  const relevantScenario = (() => {
    const s = scenarios?.[activeScenario];
    if (!s) return null;
    const sum = (s.liquid || 0) + (s.verzinslich || 0) + (s.wertpapiere || 0) + (s.sonstiges || 0);
    if (sum !== 100) return null;
    const total = Number(phase1?.betrag) || 0;
    return {
      id: activeScenario,
      name: activeScenario === 'liquid' ? 'Höhere Liquidität' : activeScenario === 'balanced' ? 'Ausgewogene Struktur' : 'Höherer langfristiger Anteil',
      pct: s,
      absolute: {
        liquid: Math.round(total * (s.liquid || 0) / 100),
        verzinslich: Math.round(total * (s.verzinslich || 0) / 100),
        wertpapiere: Math.round(total * (s.wertpapiere || 0) / 100),
        sonstiges: Math.round(total * (s.sonstiges || 0) / 100),
      },
    };
  })();
  const ladderUsed = (ladder || []).some((r) => (Number(r.amount) || 0) > 0);
  return {
    createdAt: new Date().toISOString(),
    phase1: {
      betrag: Number(phase1?.betrag) || 0,
      horizont: phase1?.horizont || null,
      liquiditaet: phase1?.liquiditaet || null,
      risiko: phase1?.risiko || null,
      ziele: Array.isArray(phase1?.ziele) ? phase1.ziele : [],
    },
    phase2: {
      entnahmen: phase2?.entnahmen || null,
      bestReserve: phase2?.bestReserve || null,
      wertpapierPct: Number(phase2?.wertpapierPct) || 0,
      verzinsBetrag: Number(phase2?.verzinsBetrag) || 0,
      reserveBetrag: Number(phase2?.reserveBetrag) || 0,
      institute: Number(phase2?.institute) || 0,
    },
    struct: struct ? { ...struct } : null,
    ladder: ladderUsed ? (ladder || []).map((r) => ({ ...r })) : null,
    scenario: relevantScenario,
    clusterHints: Array.isArray(clusterHints) ? clusterHints.map((h) => ({ ...h })) : [],
    liquidHints: Array.isArray(liquidHints) ? [...liquidHints] : [],
    zinsGroups: Array.isArray(zinsGroups) && zinsGroups.some((g) => g.offerCount > 0)
      ? zinsGroups.map((g) => ({ key: g.key, label: g.label, offerCount: g.offerCount, minRate: g.minRate, maxRate: g.maxRate, liquidity: g.liquidity }))
      : null,
    zinsLoadedAt: zinsLoadedAt || null,
  };
}

function deriveDiscussionTopics(snapshot) {
  const t = [];
  if (snapshot.phase2.reserveBetrag > 0 || snapshot.phase1.liquiditaet || snapshot.phase2.entnahmen) t.push({ key: 'liq', title: 'Liquiditätsplanung', body: 'Umgang mit kurzfristig verfügbaren Mitteln, Reserve-Größe und Planung geplanter Entnahmen.' });
  if (snapshot.ladder || snapshot.phase2.verzinsBetrag > 0) t.push({ key: 'zins', title: 'Zins- und Laufzeitenstruktur', body: 'Verteilung auf unterschiedliche Fälligkeiten, Laufzeitenmix und Zinsband im aktuellen Marktumfeld.' });
  if ((snapshot.phase1.betrag || 0) >= 500000 || snapshot.phase2.wertpapierPct > 0) t.push({ key: 'div', title: 'Diversifikation', body: 'Verteilung über Anlageklassen, Regionen und Zeit als eigenständiger Baustein.' });
  if (snapshot.phase2.wertpapierPct > 0) t.push({ key: 'wp', title: 'Wertpapierstruktur', body: 'Ausrichtung der Wertpapierquote, Chancen- und Risikoprofil im Gesamtvermögen.' });
  if (snapshot.clusterHints.length > 0 || snapshot.phase1.risiko) t.push({ key: 'risk', title: 'Risikobetrachtung', body: 'Volatilität, Drawdown und Konzentrationen im Kontext Ihrer Risikoneigung.' });
  if (snapshot.phase2.institute > 0 || snapshot.phase2.verzinsBetrag > 0) t.push({ key: 'esi', title: 'Einlagensicherung', body: 'Institutsspezifische Betrachtung der Absicherung Ihrer verzinslichen Einlagen.' });
  if ((snapshot.phase1.ziele || []).length > 0) t.push({ key: 'ziele', title: 'Persönliche Ziele', body: 'Ordnung und Priorisierung Ihrer Vermögensziele und Lebensphasen.' });
  return t;
}

export default function ReportBuilder({ phase1, phase2, struct, ladder, scenarios, activeScenario, clusterHints, liquidHints, zinsGroups, zinsLoadedAt }) {
  const [snapshot, setSnapshot] = useState(null);
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState({ vorname: '', nachname: '', email: '' });

  usePrintIsolation(open);

  const canCreate = (Number(phase1?.betrag) || 0) >= 100000;

  const createSnapshot = useCallback(() => {
    setSnapshot(buildSnapshot({ phase1, phase2, struct, ladder, scenarios, activeScenario, clusterHints, liquidHints, zinsGroups, zinsLoadedAt }));
    setOpen(true);
  }, [phase1, phase2, struct, ladder, scenarios, activeScenario, clusterHints, liquidHints, zinsGroups, zinsLoadedAt]);

  const refreshSnapshot = useCallback(() => {
    setSnapshot(buildSnapshot({ phase1, phase2, struct, ladder, scenarios, activeScenario, clusterHints, liquidHints, zinsGroups, zinsLoadedAt }));
  }, [phase1, phase2, struct, ladder, scenarios, activeScenario, clusterHints, liquidHints, zinsGroups, zinsLoadedAt]);

  const printReport = () => { window.print(); };

  const dateStr = useMemo(() => snapshot ? new Date(snapshot.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) : '', [snapshot]);
  const topics = useMemo(() => snapshot ? deriveDiscussionTopics(snapshot) : [], [snapshot]);

  return (
    <>
      {/* CTA am Ende des Simulators */}
      <section className="mt-16 border-t border-bank-border pt-12" aria-labelledby="gv-report-title" data-testid="gv-report-cta">
        <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-end">
          <div>
            <Eyebrow>Vermögensreport · Phase 3</Eyebrow>
            <h3 id="gv-report-title" className="mt-3 font-display text-[1.5rem] font-light leading-snug tracking-[-0.015em] text-bank-text">
              Persönlichen Vermögensreport erstellen.
            </h3>
            <p className="mt-3 text-[14.5px] leading-[1.8] text-bank-text-muted">
              Fassen Sie Ihre Ausgangssituation, Vermögensstruktur und ausgewählten Szenarien
              übersichtlich zusammen. Die Vorschau öffnet in dieser Ansicht — als PDF speichern
              Sie über die Druck-Funktion (A4).
            </p>
            {!canCreate && (
              <p className="mt-3 text-[12.5px] text-bank-text-soft">
                Bitte zuerst im Phase-1-Tool ein Anlagevermögen ab 100.000 € festlegen.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
            <Button type="button" variant="primary" size="xl" onClick={createSnapshot} disabled={!canCreate} data-testid="gv-report-create">
              <FileText className="mr-2 h-4 w-4" strokeWidth={1.8} aria-hidden />
              Vermögensreport erstellen
            </Button>
          </div>
        </div>
      </section>

      {open && snapshot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gv-report-preview-title"
          data-testid="gv-report-dialog"
          className="fixed inset-0 z-[110] overflow-y-auto bg-black/60 backdrop-blur-sm"
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        >
          {/* Toolbar (nicht im Druck) */}
          <div data-print-hide className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-bank-ink px-5 py-3 text-white sm:px-8">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
              Vorschau · {dateStr}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={refreshSnapshot} data-testid="gv-report-refresh" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-[13px] font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-ink">
                <RefreshCw className="h-4 w-4" strokeWidth={1.8} aria-hidden /> Report aktualisieren
              </button>
              <button type="button" onClick={printReport} data-testid="gv-report-print" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-bank-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-bank-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-ink">
                <Printer className="h-4 w-4" strokeWidth={1.8} aria-hidden /> Drucken · Als PDF speichern
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" data-testid="gv-report-close" className="inline-flex min-h-[44px] w-11 items-center justify-center rounded-full border border-white/25 text-white hover:bg-white/10">
                <X className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              </button>
            </div>
          </div>

          {/* Persönliche Angaben (optional) — nur in der Live-Vorschau anzeigen */}
          <div data-print-hide className="mx-auto mt-6 max-w-[820px] px-5 sm:px-8">
            <div className="border border-bank-border bg-white p-5 shadow-editorial-sm">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Persönliche Angaben · optional</p>
              <p className="mt-1 text-[12.5px] text-bank-text-soft">Nicht verpflichtend. Wird nur im Report angezeigt — keine Speicherung.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="block text-[12px] text-bank-text-muted">
                  Vorname
                  <input type="text" value={contact.vorname} onChange={(e) => setContact((c) => ({ ...c, vorname: e.target.value }))} data-testid="gv-report-vorname" className="mt-1 min-h-[44px] w-full rounded-md border border-bank-border bg-white px-3 py-2 text-[14px] text-bank-text focus:border-bank-primary focus:outline-none focus:ring-2 focus:ring-bank-primary/20" />
                </label>
                <label className="block text-[12px] text-bank-text-muted">
                  Nachname
                  <input type="text" value={contact.nachname} onChange={(e) => setContact((c) => ({ ...c, nachname: e.target.value }))} data-testid="gv-report-nachname" className="mt-1 min-h-[44px] w-full rounded-md border border-bank-border bg-white px-3 py-2 text-[14px] text-bank-text focus:border-bank-primary focus:outline-none focus:ring-2 focus:ring-bank-primary/20" />
                </label>
                <label className="block text-[12px] text-bank-text-muted">
                  E-Mail
                  <input type="email" value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} data-testid="gv-report-email" className="mt-1 min-h-[44px] w-full rounded-md border border-bank-border bg-white px-3 py-2 text-[14px] text-bank-text focus:border-bank-primary focus:outline-none focus:ring-2 focus:ring-bank-primary/20" />
                </label>
              </div>
            </div>
          </div>

          {/* Report-Body — dies wird gedruckt */}
          <article data-report-root data-testid="gv-report-preview" className="mx-auto my-6 max-w-[820px] bg-white px-6 py-10 text-bank-text shadow-editorial-sm sm:px-10 sm:py-14">
            {/* SEITE 1 — Cover */}
            <section className="report-page avoid-break" aria-labelledby="gv-report-preview-title">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-bank-gold">Fröhlich Vermögensberatung · Kapital-Direkt24</p>
              <h1 id="gv-report-preview-title" className="mt-6 font-display text-[2.5rem] font-light leading-[1.05] tracking-[-0.02em] sm:text-[3rem]" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
                Ihr Vermögensreport
              </h1>
              <p className="mt-4 max-w-xl text-[14.5px] leading-[1.8] text-bank-text-muted">
                Persönliche Übersicht zur Vorbereitung Ihrer weiteren Vermögensplanung.
              </p>
              <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-3 border-t border-bank-border pt-6 text-[13.5px]">
                <div className="flex flex-col">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-soft">Erstellungsdatum</dt>
                  <dd className="mt-1 font-medium text-bank-text">{dateStr}</dd>
                </div>
                <div className="flex flex-col">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-soft">Gesamtvermögen</dt>
                  <dd className="mt-1 font-display text-[1.15rem] font-medium text-bank-text" data-testid="gv-report-cover-total">{EURO.format(snapshot.phase1.betrag)}</dd>
                </div>
                {(contact.vorname || contact.nachname) && (
                  <div className="col-span-2 flex flex-col">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-soft">Für</dt>
                    <dd className="mt-1 font-medium text-bank-text">{[contact.vorname, contact.nachname].filter(Boolean).join(' ')}{contact.email && <span className="ml-2 text-bank-text-muted">· {contact.email}</span>}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-16 text-[10.5px] leading-relaxed text-bank-text-soft">Seite 1</p>
            </section>

            {/* SEITE 2 — Ausgangssituation */}
            <section className="report-page mt-14 avoid-break" aria-labelledby="gv-report-ausgang-title">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Kapitel 01</p>
              <h2 id="gv-report-ausgang-title" className="mt-3 font-display text-[1.8rem] font-light leading-tight tracking-[-0.015em]">Ihre Ausgangssituation</h2>
              <table className="mt-6 w-full border-collapse text-[13.5px]" data-testid="gv-report-ausgang-table">
                <caption className="sr-only">Ausgangssituation und persönliche Rahmenbedingungen</caption>
                <tbody>
                  {[
                    ['Anlagevermögen', EURO.format(snapshot.phase1.betrag)],
                    ['Anlagehorizont', snapshot.phase1.horizont || '—'],
                    ['Liquiditätsbedarf', snapshot.phase1.liquiditaet || '—'],
                    ['Risikoneigung', snapshot.phase1.risiko || '—'],
                    ['Geplante kurzfristige Entnahmen', snapshot.phase2.entnahmen || '—'],
                    ['Bestehende Liquiditätsreserve', snapshot.phase2.bestReserve || '—'],
                    ['Ziele', (snapshot.phase1.ziele || []).join(' · ') || '—'],
                  ].map(([k, v]) => (
                    <tr key={k} className="border-b border-bank-border">
                      <th scope="row" className="py-3 pr-6 text-left font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">{k}</th>
                      <td className="py-3 text-right font-medium text-bank-text">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-8 text-[10.5px] text-bank-text-soft">Seite 2</p>
            </section>

            {/* SEITE 3 — Vermögensstruktur */}
            {snapshot.struct && snapshot.struct.total > 0 && (
              <section className="report-page mt-14 avoid-break" aria-labelledby="gv-report-struct-title">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Kapitel 02</p>
                <h2 id="gv-report-struct-title" className="mt-3 font-display text-[1.8rem] font-light leading-tight tracking-[-0.015em]">Vermögensstruktur</h2>
                <table className="mt-6 w-full border-collapse text-[13.5px]" data-testid="gv-report-struct-table">
                  <caption className="sr-only">Aufteilung des Vermögens auf Kategorien — absolute Beträge und prozentuale Anteile</caption>
                  <thead>
                    <tr className="border-b border-bank-border">
                      <th scope="col" className="py-2 pr-6 text-left font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Kategorie</th>
                      <th scope="col" className="py-2 pr-6 text-right font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Betrag</th>
                      <th scope="col" className="py-2 text-right font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Anteil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORY_ORDER.map(({ key, label }) => {
                      const val = snapshot.struct[key] || 0;
                      const pct = snapshot.struct.total > 0 ? (val / snapshot.struct.total) * 100 : 0;
                      return (
                        <tr key={key} className="border-b border-bank-border">
                          <th scope="row" className="py-3 pr-6 text-left font-medium text-bank-text">{label}</th>
                          <td className="py-3 pr-6 text-right text-bank-text">{EURO.format(val)}</td>
                          <td className="py-3 text-right text-bank-text">{PCT(pct)}</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <th scope="row" className="py-3 pr-6 text-left font-mono text-[11px] uppercase tracking-[0.22em] text-bank-gold">Gesamt</th>
                      <td className="py-3 pr-6 text-right font-semibold text-bank-text">{EURO.format(snapshot.struct.total)}</td>
                      <td className="py-3 text-right font-semibold text-bank-text">100 %</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-8 text-[10.5px] text-bank-text-soft">Seite 3</p>
              </section>
            )}

            {/* SEITE 4 — Liquidität + Ladder */}
            <section className="report-page mt-14 avoid-break" aria-labelledby="gv-report-liq-title">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Kapitel 03</p>
              <h2 id="gv-report-liq-title" className="mt-3 font-display text-[1.8rem] font-light leading-tight tracking-[-0.015em]">Liquidität & Verfügbarkeit</h2>
              <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 text-[13px]">
                <div><dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Liquiditätsbedarf</dt><dd className="mt-1 font-medium">{snapshot.phase1.liquiditaet || '—'}</dd></div>
                <div><dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Geplante Entnahmen</dt><dd className="mt-1 font-medium">{snapshot.phase2.entnahmen || '—'}</dd></div>
                <div><dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Vorhandene Reserve</dt><dd className="mt-1 font-medium">{EURO.format(snapshot.phase2.reserveBetrag)} · {snapshot.phase2.bestReserve || '—'}</dd></div>
              </dl>
              {snapshot.liquidHints.length > 0 && (
                <ul className="mt-6 space-y-2 text-[13px]">
                  {snapshot.liquidHints.map((h, i) => (<li key={i} className="border-l-2 border-bank-gold pl-3 text-bank-text-muted">{h}</li>))}
                </ul>
              )}

              {snapshot.ladder && (
                <>
                  <h3 className="mt-10 font-display text-[1.35rem] font-light leading-tight">Zins- und Laufzeitenstruktur</h3>
                  {(() => {
                    const sum = snapshot.ladder.reduce((s, r) => s + (Number(r.amount) || 0), 0);
                    const rest = Math.max(0, (snapshot.phase1.betrag || 0) - sum);
                    return (
                      <table className="mt-4 w-full border-collapse text-[13px]" data-testid="gv-report-ladder-table">
                        <thead>
                          <tr className="border-b border-bank-border">
                            <th scope="col" className="py-2 pr-6 text-left font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Laufzeit</th>
                            <th scope="col" className="py-2 pr-6 text-right font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Betrag</th>
                            <th scope="col" className="py-2 text-right font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Anteil</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snapshot.ladder.map((r) => {
                            const l = ({ daily: 'Täglich verfügbar', m3: '3 Monate', m6: '6 Monate', m12: '12 Monate', m24: '24 Monate', m36: '36 Monate' })[r.key] || r.key;
                            const share = sum > 0 ? (r.amount / sum) * 100 : 0;
                            return (
                              <tr key={r.key} className="border-b border-bank-border">
                                <th scope="row" className="py-2 pr-6 text-left font-medium">{l}</th>
                                <td className="py-2 pr-6 text-right">{EURO.format(r.amount || 0)}</td>
                                <td className="py-2 text-right">{PCT(share)}</td>
                              </tr>
                            );
                          })}
                          <tr>
                            <th scope="row" className="py-2 pr-6 text-left font-mono text-[11px] uppercase tracking-[0.22em] text-bank-gold">Zugeordnet</th>
                            <td className="py-2 pr-6 text-right font-semibold">{EURO.format(sum)}</td>
                            <td className="py-2 text-right font-semibold">—</td>
                          </tr>
                          <tr>
                            <th scope="row" className="py-2 pr-6 text-left font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">Noch nicht zugeordnet</th>
                            <td className="py-2 pr-6 text-right">{EURO.format(rest)}</td>
                            <td className="py-2 text-right">—</td>
                          </tr>
                        </tbody>
                      </table>
                    );
                  })()}
                  {snapshot.zinsGroups && (
                    <>
                      <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-soft">Marktdaten zum Zeitpunkt der Reporterstellung</p>
                      <table className="mt-2 w-full border-collapse text-[12.5px]">
                        <thead>
                          <tr className="border-b border-bank-border">
                            <th scope="col" className="py-1.5 pr-6 text-left">Laufzeit</th>
                            <th scope="col" className="py-1.5 pr-6 text-right">Angebote</th>
                            <th scope="col" className="py-1.5 text-right">Zinsband</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snapshot.zinsGroups.map((g) => (
                            <tr key={g.key} className="border-b border-bank-border">
                              <th scope="row" className="py-1.5 pr-6 text-left">{g.label}</th>
                              <td className="py-1.5 pr-6 text-right">{g.offerCount}</td>
                              <td className="py-1.5 text-right">{g.minRate != null && g.maxRate != null ? (g.minRate === g.maxRate ? `${g.maxRate.toLocaleString('de-DE')} %` : `${g.minRate.toLocaleString('de-DE')} – ${g.maxRate.toLocaleString('de-DE')} %`) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </>
              )}
              <p className="mt-8 text-[10.5px] text-bank-text-soft">Seite 4</p>
            </section>

            {/* SEITE 5 — Einlagensicherung + Strukturhinweise */}
            {(snapshot.phase2.verzinsBetrag > 0 || snapshot.clusterHints.length > 0) && (
              <section className="report-page mt-14 avoid-break" aria-labelledby="gv-report-esi-title">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Kapitel 04</p>
                <h2 id="gv-report-esi-title" className="mt-3 font-display text-[1.8rem] font-light leading-tight tracking-[-0.015em]">Einlagensicherung im Blick</h2>
                {snapshot.phase2.verzinsBetrag > 0 && (
                  <dl className="mt-6 grid grid-cols-3 gap-x-6 gap-y-3 text-[13px]" data-testid="gv-report-esi-block">
                    <div><dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Verzinslich gesamt</dt><dd className="mt-1 font-medium">{EURO.format(snapshot.phase2.verzinsBetrag)}</dd></div>
                    <div><dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Anzahl Institute</dt><dd className="mt-1 font-medium">{snapshot.phase2.institute || '—'}</dd></div>
                    <div><dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Ø pro Institut</dt><dd className="mt-1 font-medium">{snapshot.phase2.institute > 0 ? EURO.format(Math.round(snapshot.phase2.verzinsBetrag / snapshot.phase2.institute)) : '—'}</dd></div>
                  </dl>
                )}
                <p className="mt-4 border-l-2 border-bank-gold pl-3 text-[12.5px] leading-relaxed text-bank-text-muted">
                  In der EU liegt die gesetzliche Einlagen­sicherungsgrenze regelmäßig bei <strong>100.000 € pro Person und Institut</strong>. Die tatsächliche Absicherung hängt von Institut, Einleger, Produkt und weiteren Voraussetzungen ab. Es wird <strong>keine</strong> pauschale Absicherung Ihres Gesamt­betrags behauptet.
                </p>

                {snapshot.clusterHints.length > 0 && (
                  <>
                    <h3 className="mt-10 font-display text-[1.35rem] font-light leading-tight">Beobachtungen zur Struktur</h3>
                    <ul className="mt-4 space-y-2 text-[13px]">
                      {snapshot.clusterHints.map((h, i) => (<li key={i} className="border-l-2 border-bank-amber pl-3 text-bank-text-muted">{h.text} <span className="text-bank-text-soft">({PCT((h.share || 0) * 100)})</span></li>))}
                    </ul>
                  </>
                )}
                <p className="mt-8 text-[10.5px] text-bank-text-soft">Seite 5</p>
              </section>
            )}

            {/* SEITE 6 — Szenario */}
            {snapshot.scenario && (
              <section className="report-page mt-14 avoid-break" aria-labelledby="gv-report-scen-title" data-testid="gv-report-scenario">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Kapitel 05</p>
                <h2 id="gv-report-scen-title" className="mt-3 font-display text-[1.8rem] font-light leading-tight tracking-[-0.015em]">Betrachtete Strukturvariante</h2>
                <p className="mt-2 text-[12px] text-bank-text-soft">Beispielhafte Strukturvariante — keine Anlageempfehlung.</p>
                <p className="mt-4 font-medium text-bank-text">{snapshot.scenario.name}</p>
                <table className="mt-4 w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-bank-border">
                      <th scope="col" className="py-2 pr-6 text-left font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Kategorie</th>
                      <th scope="col" className="py-2 pr-6 text-right font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Anteil</th>
                      <th scope="col" className="py-2 text-right font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Betrag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORY_ORDER.map(({ key, label }) => (
                      <tr key={key} className="border-b border-bank-border">
                        <th scope="row" className="py-2 pr-6 text-left font-medium">{label}</th>
                        <td className="py-2 pr-6 text-right">{PCT(snapshot.scenario.pct[key] || 0)}</td>
                        <td className="py-2 text-right">{EURO.format(snapshot.scenario.absolute[key] || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-8 text-[10.5px] text-bank-text-soft">Seite 6</p>
              </section>
            )}

            {/* LETZTE SEITE — Gesprächsthemen + Kontakt + Disclaimer */}
            <section className="report-page mt-14 avoid-break" aria-labelledby="gv-report-topics-title">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Nächste Schritte</p>
              <h2 id="gv-report-topics-title" className="mt-3 font-display text-[1.8rem] font-light leading-tight tracking-[-0.015em]">Themen für Ihr persönliches Vermögensgespräch</h2>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2" data-testid="gv-report-topics">
                {topics.map((t, i) => (
                  <li key={t.key} className="border-l-2 border-bank-primary pl-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-soft">{String(i + 1).padStart(2, '0')}</p>
                    <p className="mt-1 font-medium text-bank-text">{t.title}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-bank-text-muted">{t.body}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-10 border-t border-bank-border pt-6 text-[12.5px] leading-[1.7] text-bank-text-muted">
                <p><strong>Vermögensgespräch vereinbaren:</strong> Fröhlich Vermögensberatung GmbH · Bösgrunder Weg 62 · 55543 Bad Kreuznach</p>
                <p className="mt-1">Kundenservice: kundenservice@kapital-direkt24.de · Mo–Fr · 09:00 – 18:00</p>
                <Link data-print-hide to="/contact" className="mt-4 inline-flex items-center gap-1.5 font-semibold text-bank-primary hover:text-bank-primary/80">Gespräch online vereinbaren <ArrowUpRight size={13} strokeWidth={1.8} aria-hidden /></Link>
              </div>
              <p className="mt-10 border-t border-bank-border pt-4 text-[10.5px] leading-relaxed text-bank-text-soft">{DISCLAIMER}</p>
              <p className="mt-6 text-[10.5px] text-bank-text-soft">Letzte Seite · {dateStr}</p>
            </section>
          </article>
        </div>
      )}
    </>
  );
}
