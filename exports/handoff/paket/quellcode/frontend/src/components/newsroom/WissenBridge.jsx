import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { WISSEN_ARTICLES } from '@/data/wissenArticles';
import { matchWissenBridge } from '@/design-system/newsroom';
import { resolveAccentPair } from '@/design-system/accents';

/**
 * Session 80.48 — News → Wissen Bridge ("Zum Verständnis").
 *
 * Zeigt bis zu 3 evergreen Wissen-Artikel, die semantisch (Tag/Topic-Overlap)
 * zum übergebenen News-Item passen. Wenn keine Übereinstimmung existiert,
 * rendert nichts — keine Fake-Beziehungen.
 *
 * Accent-Paar: champagne (Editorial-Surface) + navy (Text/Links) — konform
 * mit ALLOWED_ACCENT_PAIRS.champagne = ['navy', 'gold', 'violet'].
 */
export const WissenBridge = ({ article, articles = null, wissen = WISSEN_ARTICLES, className = '' }) => {
  const source = articles || (article ? [article] : []);
  const matches = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const a of source) {
      for (const w of matchWissenBridge(a, wissen, 3)) {
        if (!seen.has(w.slug)) { seen.add(w.slug); out.push(w); }
        if (out.length >= 3) break;
      }
      if (out.length >= 3) break;
    }
    return out;
  }, [source, wissen]);

  if (matches.length === 0) return null;
  const { secondary: editorial } = resolveAccentPair('navy', 'champagne');

  return (
    <aside
      data-testid="news-wissen-bridge"
      aria-label="Zum Verständnis — passende Wissen-Artikel"
      className={`border-y border-bank-champagne-border ${editorial.tint} px-5 py-8 sm:px-8 ${className}`}
    >
      <div className="mx-auto max-w-[1100px]">
        <p className={`font-mono text-[10.5px] uppercase tracking-[0.24em] ${editorial.text}`}>
          Zum Verständnis
        </p>
        <p className="mt-2 max-w-2xl font-serif text-[17px] leading-snug text-bank-text">
          Grundlagen aus unserem Wissensbereich, die zu diesen Nachrichten passen.
        </p>
        <ul className="mt-6 divide-y divide-bank-champagne-border border-y border-bank-champagne-border">
          {matches.map((w) => (
            <li key={w.slug}>
              <Link
                to={`/wissen/${w.slug}`}
                className="group flex items-start justify-between gap-6 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40"
                data-testid={`news-wissen-bridge-item-${w.slug}`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <BookOpen size={16} strokeWidth={1.6} className="mt-1 shrink-0 text-bank-text-muted" aria-hidden />
                  <div className="min-w-0">
                    <h3 className="font-serif text-[16px] leading-snug text-bank-text transition-colors group-hover:text-bank-primary">
                      {w.title}
                    </h3>
                    {w.lede && (
                      <p className="mt-1 line-clamp-2 max-w-2xl text-[13px] leading-relaxed text-bank-text-muted">
                        {w.lede}
                      </p>
                    )}
                  </div>
                </div>
                <span className="mt-1 inline-flex shrink-0 items-center gap-1 self-start whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-primary">
                  Lesen
                  <ArrowUpRight size={12} strokeWidth={1.7} aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default WissenBridge;
