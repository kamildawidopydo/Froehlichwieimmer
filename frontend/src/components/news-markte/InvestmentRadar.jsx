import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';

const TAG_STYLE = {
  'Langfristiger Trend': 'bg-emerald-50 text-emerald-800 border-emerald-100',
  'Unter Beobachtung': 'bg-neutral-50 text-bank-text-muted border-neutral-200',
  'Erhöhte Marktaktivität': 'bg-amber-50 text-amber-800 border-amber-100',
  'Neue Entwicklung': 'bg-sky-50 text-sky-800 border-sky-100',
  'Defensives Thema': 'bg-slate-50 text-slate-700 border-slate-200',
};

const InvestmentRadar = ({ items = [], loading }) => (
  <section className="border-t border-bank-border pt-14 sm:pt-16" data-testid="investment-radar">
    <div className="flex flex-col gap-3">
      <Eyebrow>Radar</Eyebrow>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-serif text-3xl leading-tight text-bank-text sm:text-4xl">Investment-Radar</h2>
        <p className="max-w-md text-[13.5px] text-bank-text-muted sm:text-right">
          Themen, die wir aufgrund wirtschaftlicher Entwicklungen verstärkt beobachten. Keine Anlageempfehlung.
        </p>
      </div>
    </div>

    {loading ? (
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3].map((i) => (<div key={i} className="h-24 animate-pulse bg-neutral-100" />))}
      </div>
    ) : (
      <>
        {/* Desktop table */}
        <div className="mt-8 hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-left text-[13.5px]" data-testid="radar-table">
            <thead className="border-b border-bank-border text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
              <tr>
                <th className="pb-3 pr-4 font-medium">Thema</th>
                <th className="pb-3 pr-4 font-medium">Kategorie</th>
                <th className="pb-3 pr-4 font-medium">Warum relevant</th>
                <th className="pb-3 pr-4 font-medium">Zeithorizont</th>
                <th className="pb-3 pr-4 font-medium">Kennzeichnung</th>
                <th className="pb-3 font-medium">News</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bank-border">
              {items.map((it) => (
                <tr key={it.id} className="group hover:bg-neutral-50/50" data-testid="radar-row">
                  <td className="py-5 pr-4 font-serif text-[15px] leading-snug text-bank-text">{it.theme}</td>
                  <td className="py-5 pr-4 text-bank-text-muted">{it.category}</td>
                  <td className="py-5 pr-4 max-w-xs text-bank-text-muted">{it.why}</td>
                  <td className="py-5 pr-4 font-mono text-[12.5px] text-bank-accent-strong">{it.horizon}</td>
                  <td className="py-5 pr-4">
                    <span className={`inline-block border px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.18em] ${TAG_STYLE[it.tag] || TAG_STYLE['Unter Beobachtung']}`}>
                      {it.tag}
                    </span>
                  </td>
                  <td className="py-5">
                    {it.related_slug ? (
                      <a href={`https://kapital-direkt24.de/news/${it.related_slug}`}
                         target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1 text-[12.5px] text-bank-accent-strong hover:underline">
                        Meldung
                        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.4} />
                      </a>
                    ) : <span className="text-neutral-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mt-8 grid grid-cols-1 gap-3 md:hidden">
          {items.map((it) => (
            <div key={it.id} className="border border-bank-border bg-white p-5" data-testid="radar-card-mobile">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif text-base leading-snug text-bank-text">{it.theme}</h3>
                <span className={`shrink-0 border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] ${TAG_STYLE[it.tag] || TAG_STYLE['Unter Beobachtung']}`}>
                  {it.tag}
                </span>
              </div>
              <p className="mt-2 text-[11.5px] uppercase tracking-[0.16em] text-bank-text-muted">{it.category}</p>
              <p className="mt-3 text-[13px] leading-relaxed text-bank-text-muted">{it.why}</p>
              <div className="mt-3 flex items-center justify-between border-t border-bank-border pt-3 text-[11.5px]">
                <span className="font-mono text-bank-accent-strong">{it.horizon}</span>
              </div>
            </div>
          ))}
        </div>
      </>
    )}
  </section>
);

export default InvestmentRadar;
