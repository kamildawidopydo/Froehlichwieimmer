import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { fetchActiveInvestmentTopics } from '@/services/investmentTopics';

const COPY = {
  aktien: {
    eyebrow: 'Mehr zum Thema',
    headline: 'Aktien & Kapitalmärkte verstehen',
    body: 'Erfahren Sie, welche Rolle Aktien innerhalb einer langfristigen Vermögensstrategie spielen können und welche Risiken Anleger beachten sollten.',
    cta: 'Zum Thema Aktien',
  },
  anleihen: {
    eyebrow: 'Mehr zum Thema',
    headline: 'Anleihen & Zinsen besser einordnen',
    body: 'Erfahren Sie mehr über Funktionsweise, Chancen und Risiken von Anleihen und welche Rolle sie innerhalb einer Vermögensstrategie spielen können.',
    cta: 'Zum Thema Anleihen',
  },
};

/**
 * Dezente Box am Ende eines News-Artikels — verlinkt auf ein aktives
 * Investment-Thema. Zeigt sich nur, wenn das referenzierte Thema aktiv
 * (`enabled=true`) in der `/investment-topics/active`-Liste enthalten ist.
 */
const TopicCrossLinkBox = ({ topicSlug }) => {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!topicSlug) return;
    let alive = true;
    fetchActiveInvestmentTopics()
      .then((items) => {
        if (!alive) return;
        setAvailable(!!(items || []).find((t) => t.slug === topicSlug));
      })
      .catch(() => { if (alive) setAvailable(false); });
    return () => { alive = false; };
  }, [topicSlug]);

  if (!topicSlug || !available) return null;
  const copy = COPY[topicSlug] || {
    eyebrow: 'Mehr zum Thema',
    headline: 'Passendes Investmentthema',
    body: 'Weitere Einordnungen und Hintergründe zu diesem Thema.',
    cta: 'Zum Thema',
  };

  return (
    <aside
      className="mt-12 border border-bank-border bg-bank-bg p-6 sm:p-8"
      data-testid="news-topic-crosslink"
    >
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
        {copy.eyebrow}
      </p>
      <h3 className="mt-3 font-serif text-[22px] leading-tight text-bank-text">
        {copy.headline}
      </h3>
      <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-bank-text-muted">
        {copy.body}
      </p>
      <Link
        to={`/themen/${topicSlug}`}
        data-testid={`news-topic-crosslink-cta-${topicSlug}`}
        className="mt-5 inline-flex items-center gap-1.5 border-b border-bank-primary pb-0.5 text-[12px] font-medium uppercase tracking-[0.16em] text-bank-primary hover:text-bank-primary/80"
      >
        {copy.cta} <ArrowUpRight size={13} strokeWidth={1.7} />
      </Link>
    </aside>
  );
};

export default TopicCrossLinkBox;
