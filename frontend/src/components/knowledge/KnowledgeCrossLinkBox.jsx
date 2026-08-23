import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

/**
 * Dezente Wissens-Cross-Link-Box für News → Grundlagenseiten.
 * Absichtlich neutraler als `TopicCrossLinkBox` (bank-gold Akzent auf
 * bank-bg, kleiner CTA statt Button) — es ist Bildung, keine Conversion.
 */
const KnowledgeCrossLinkBox = ({
  eyebrow = 'Wissen & Grundlagen',
  title,
  description,
  href,
  cta = 'Mehr erfahren',
  testId,
}) => {
  if (!href || !title) return null;
  return (
    <aside
      className="mt-10 border border-bank-border bg-white p-6 sm:p-7"
      data-testid={testId || 'knowledge-crosslink'}
    >
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
        {eyebrow}
      </p>
      <h3 className="mt-2 font-serif text-[19px] leading-tight text-bank-text">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-bank-text-muted">
          {description}
        </p>
      )}
      <Link
        to={href}
        data-testid={testId ? `${testId}-cta` : 'knowledge-crosslink-cta'}
        className="mt-4 inline-flex items-center gap-1.5 border-b border-bank-primary pb-0.5 text-[12px] font-medium uppercase tracking-[0.16em] text-bank-primary hover:text-bank-primary/80"
      >
        {cta} <ArrowUpRight size={13} strokeWidth={1.7} />
      </Link>
    </aside>
  );
};

export default KnowledgeCrossLinkBox;
