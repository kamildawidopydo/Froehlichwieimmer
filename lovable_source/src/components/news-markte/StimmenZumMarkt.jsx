import React from 'react';
import { ArrowUpRight, Quote } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import { formatRelative } from '@/services/newsMarkteApi';

const VoiceCard = ({ voice }) => (
  <a href={voice.source_url || '#'} target="_blank" rel="noopener noreferrer"
     className="group flex flex-col gap-4 border border-bank-border bg-white p-5 transition-colors hover:border-bank-accent-strong/50"
     data-testid="voice-card">
    <div className="flex items-start justify-between gap-3">
      <Quote className="h-5 w-5 text-bank-accent-strong" strokeWidth={1.4} />
      <span className="border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.18em] text-bank-text-muted">
        Externe Meinung
      </span>
    </div>
    <p className="text-[14px] leading-relaxed text-bank-text">„{voice.excerpt}"</p>
    <div className="mt-auto border-t border-bank-border pt-3">
      <p className="text-[11.5px] uppercase tracking-[0.18em] text-bank-text-muted">{voice.topic}</p>
      <div className="mt-1 flex items-center justify-between text-[12.5px]">
        <span className="font-serif text-bank-text">{voice.source}</span>
        <span className="flex items-center gap-1.5 font-mono text-[11.5px] text-bank-accent-strong">
          {formatRelative(voice.published_at)}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.4} />
        </span>
      </div>
    </div>
  </a>
);

const StimmenZumMarkt = ({ voices = [], loading, editorial = [] }) => {
  const ourTake = editorial[0];
  return (
    <section className="border-t border-bank-border pt-14 sm:pt-16" data-testid="stimmen-zum-markt">
      <div className="flex flex-col gap-3">
        <Eyebrow>Experten</Eyebrow>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-serif text-3xl leading-tight text-bank-text sm:text-4xl">Stimmen zum Markt</h2>
          <p className="max-w-md text-[13.5px] text-bank-text-muted sm:text-right">
            Externe Analysten- und Research-Einschätzungen — daneben unsere eigene Einordnung.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
        {/* External voices */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-[220px] animate-pulse bg-neutral-100" />))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {voices.slice(0, 6).map((v) => (<VoiceCard key={v.id} voice={v} />))}
            </div>
          )}
        </div>

        {/* Our take (editorial pull) */}
        <aside className="border-l border-bank-border pl-6 sm:pl-8" data-testid="unsere-einordnung">
          <p className="flex items-center gap-2.5 text-[10.5px] font-medium uppercase tracking-[0.28em] text-bank-accent-strong">
            <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-accent-strong" />
            Unsere Einordnung
          </p>
          {ourTake ? (
            <>
              <h3 className="mt-4 font-serif text-xl leading-snug text-bank-text">{ourTake.title}</h3>
              {ourTake.dek && <p className="mt-3 text-[13.5px] leading-relaxed text-bank-text-muted">{ourTake.dek}</p>}
              <p className="mt-4 text-[13px] leading-[1.75] text-bank-text line-clamp-6 whitespace-pre-line">
                {ourTake.body}
              </p>
              <p className="mt-4 text-[11.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                {ourTake.author} · {formatRelative(ourTake.published_at)}
              </p>
            </>
          ) : (
            <p className="mt-4 text-[13.5px] leading-relaxed text-bank-text-muted">
              Wir ordnen aktuelle Entwicklungen langfristig ein — kurze redaktionelle Kommentare veröffentlichen
              wir hier. Es folgen weitere Einschätzungen in Kürze.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
};

export default StimmenZumMarkt;
