import { getApiBase } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';

const API_BASE = getApiBase();

const fmtPublished = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffH = (now - d) / 36e5;
    if (diffH < 1) return `vor ${Math.max(1, Math.round(diffH * 60))} Min.`;
    if (diffH < 24) return `vor ${Math.round(diffH)} Std.`;
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  } catch { return iso; }
};

/**
 * Renders 0-5 real news articles that mention the given ticker's company by
 * word-boundary alias match on title/subtitle/summary. No fabricated items.
 */
export default function StockNews({ symbol }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`${API_BASE}/api/stocks/${encodeURIComponent(symbol)}/news?limit=5`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch(() => { if (alive) { setData(null); setLoading(false); } });
    return () => { alive = false; };
  }, [symbol]);

  if (loading) return null;
  const label = data?.company_label || symbol;
  const articles = data?.articles || [];
  // Ohne passende Meldungen wird der Bereich ausgeblendet statt eines Leerzustands.
  if (articles.length === 0) return null;

  return (
    <section className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10" data-testid="public-stock-news">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">
        Aktuelle Nachrichten
      </p>
      <h2 className="mt-3 font-display text-[1.6rem] font-light leading-tight text-bank-text">
        Aktuelles zu {label}
      </h2>

      {articles.length === 0 ? (
        <p className="mt-8 text-[13.5px] leading-relaxed text-bank-text-muted">
          Aktuell liegen keine neuen Meldungen zu diesem Unternehmen vor.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-bank-border/60">
          {articles.map((a) => (
            <li key={a.slug} className="py-6 first:pt-0 last:pb-0">
              <Link
                to={`/news/${encodeURIComponent(a.slug)}`}
                className="group block outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-bank-surface rounded"
                data-testid={`public-stock-news-item-${a.slug}`}
              >
                <div className="flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">
                  {a.category && <span className="text-bank-primary-strong">{a.category}</span>}
                  {a.category && <span aria-hidden>·</span>}
                  <span>{fmtPublished(a.published_at)}</span>
                </div>
                <h3 className="mt-2 font-display text-[1.15rem] font-medium leading-tight text-bank-text group-hover:text-bank-primary-strong transition-colors sm:text-[1.25rem]">
                  {a.title}
                </h3>
                {a.summary && (
                  <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-bank-text-muted">
                    {a.summary}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-4 text-[11.5px] text-bank-text-muted">
                  {a.source_name && <span>Quelle: {a.source_name}</span>}
                  <span className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] text-bank-primary-strong opacity-0 transition-opacity group-hover:opacity-100">
                    Artikel lesen
                    <ArrowUpRight className="h-3 w-3" strokeWidth={LUCIDE_STROKE} />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
