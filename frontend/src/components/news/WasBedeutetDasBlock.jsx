import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getMoneyImpact } from '@/lib/news/moneyImpact';

/**
 * Session 80.30 — Mikrosektion „Was bedeutet das für mein Geld?"
 *
 * - Erscheint nur, wenn `getMoneyImpact` einen präzisen Match liefert (keine
 *   generischen Ratschläge).
 * - Max. 2–3 Punkte, max. 1 kontextabhängige CTA.
 * - Klar als nicht-individuelle Bildungsinfo gekennzeichnet.
 * - Keine Produktkarte, keine Sales-Funnel-Optik.
 */
const WasBedeutetDasBlock = ({ article }) => {
  const impact = getMoneyImpact(article);
  if (!impact) return null;

  // Farbklasse pro Semantik-Slot (vorhandene 80.26-Farbtokens).
  const kickerColor = {
    petrol: 'text-bank-petrol-strong',
    amber: 'text-bank-amber-strong',
    coral: 'text-bank-coral-strong',
    violet: 'text-bank-violet-strong',
  }[impact.color] || 'text-bank-amber-strong';

  const accent = {
    petrol: 'card-accent-top-petrol',
    amber: 'card-accent-top-amber',
    coral: 'card-accent-top-coral',
    violet: 'card-accent-top-violet',
  }[impact.color] || 'card-accent-top-amber';

  return (
    <aside
      data-testid="news-detail-money-impact"
      className={`card-accent-top ${accent} mt-8 border border-bank-border bg-white p-6`}
      aria-labelledby="money-impact-title"
    >
      <p
        id="money-impact-title"
        className={`font-mono text-[10.5px] uppercase tracking-[0.24em] ${kickerColor}`}
      >
        Was bedeutet das für mein Geld?
      </p>
      <ul className="mt-4 space-y-2.5" data-testid="money-impact-points">
        {impact.points.map((p, i) => (
          <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-bank-text">
            <span aria-hidden className="mt-2 inline-block h-1 w-3 shrink-0 bg-current opacity-60" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      {impact.cta?.href && (
        <Link
          to={impact.cta.href}
          data-testid="money-impact-cta"
          className={`mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium ${kickerColor} hover:opacity-80`}
        >
          {impact.cta.label}
          <ArrowRight size={13} strokeWidth={1.8} />
        </Link>
      )}
      <p className="mt-4 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
        Allgemeine Information — keine individuelle Anlageberatung.
      </p>
    </aside>
  );
};

export default WasBedeutetDasBlock;
