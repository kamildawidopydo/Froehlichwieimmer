import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { trackInvestmentEvent, InvestmentEvents } from '@/lib/investmentAnalytics';

/**
 * Wiederverwendbare Investment-Themen-Karte.
 * Wird sowohl im /themen-Grid als auch im „Weitere Investmentthemen"-Block
 * auf den Detailseiten eingesetzt — kein Duplikat-Layout.
 */
const InvestmentTopicCard = ({ topic, source, index = 0 }) => {
  const [imgErr, setImgErr] = useState(false);
  const showImage = !!topic.image_url && !imgErr;

  const handleClick = () => {
    const eventName = source === 'related'
      ? InvestmentEvents.RELATED_TOPIC_CLICK
      : InvestmentEvents.TOPIC_CARD_CLICK;
    trackInvestmentEvent(eventName, {
      topic: topic.headline,
      topic_slug: topic.slug,
      source_page: source || 'overview',
    });
  };

  return (
    <Link
      to={topic.target_url || `/themen/${topic.slug}`}
      onClick={handleClick}
      data-testid={`investment-topic-card-${topic.slug}`}
      className="group flex h-full flex-col border border-bank-border bg-white transition-colors hover:border-bank-primary"
    >
      {showImage ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
          <img
            src={topic.image_url}
            alt=""
            loading="lazy"
            onError={() => setImgErr(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        </div>
      ) : (
        <div
          aria-hidden
          className="relative aspect-[16/9] w-full overflow-hidden bg-bank-bg"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[54px] font-light leading-none text-bank-border/70">
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>
          <div className="absolute inset-x-6 bottom-4 font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">
            {topic.category}
          </div>
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 px-6 py-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
          {topic.category}
        </p>
        <h3 className="font-serif text-[22px] leading-snug text-bank-text transition-colors group-hover:text-bank-primary">
          {topic.short_title || topic.slug.charAt(0).toUpperCase() + topic.slug.slice(1)}
        </h3>
        {(topic.overview_short || topic.teaser) && (
          <p className="line-clamp-4 text-[14px] leading-relaxed text-bank-text-muted">
            {topic.overview_short || topic.teaser}
          </p>
        )}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[12px] font-medium uppercase tracking-[0.16em] text-bank-primary">
          Thema entdecken <ArrowUpRight size={13} strokeWidth={1.7} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
};

export default InvestmentTopicCard;
