import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Download, ArrowRight, Sparkles, BookOpen, MessageSquare } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

/**
 * Berechnet grobe Lesedauer (Wörter/220, min. 3 Min., ganze Minuten).
 */
export const computeReadingMinutes = (premium) => {
  if (!premium) return 5;
  const collect = [];
  const push = (v) => { if (typeof v === 'string') collect.push(v); };
  push(premium.summary);
  premium.shortExplanation?.forEach((x) => { push(x.title); push(x.body); });
  push(premium.suitableFor?.intro);
  premium.suitableFor?.points?.forEach(push);
  premium.howItWorks?.forEach(push);
  premium.aspects?.forEach((a) => { push(a.title); push(a.body); });
  push(premium.example?.body);
  premium.advantages?.forEach(push);
  premium.considerations?.forEach(push);
  premium.mistakes?.forEach(push);
  premium.comparison?.rows?.forEach((r) => { push(r.left); push(r.right); });
  premium.faqs?.forEach((f) => { push(f.q); push(f.a); });
  premium.terms?.forEach((t) => { push(t.term); push(t.body); });
  premium.deepLearn?.forEach((d) => { push(d.q); push(d.a); });
  premium.keyTakeaways?.forEach(push);
  const words = collect.join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 220));
};

/** ═══ Key Takeaways ═══ */
export const StrategyKeyTakeaways = ({ items = [] }) => {
  if (!items.length) return null;
  return (
    <section
      id="key-takeaways"
      className="mt-8 scroll-mt-24 rounded-2xl border border-bank-primary/25 bg-bank-primary/[0.04] p-5 sm:p-7"
      data-testid="strategie-key-takeaways"
      aria-label="Das Wichtigste auf einen Blick"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-bank-primary" strokeWidth={1.8} aria-hidden />
        <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">Das Wichtigste auf einen Blick</p>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5" data-testid={`strategie-takeaway-${i}`}>
            <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bank-primary" />
            <span className="text-[14px] leading-relaxed text-bank-text">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

/** ═══ Reading Time badge ═══ */
export const ReadingTimeBadge = ({ minutes }) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-full border border-bank-border bg-white px-3 py-1 text-[11.5px] text-bank-text-muted"
    data-testid="strategie-reading-time"
  >
    <BookOpen className="h-3 w-3" strokeWidth={1.8} aria-hidden />
    Lesedauer ca. {minutes} Min.
  </span>
);

/** ═══ Terms Glossary ═══ */
export const StrategyTerms = ({ items = [] }) => {
  if (!items.length) return null;
  return (
    <section id="wichtige-begriffe" className="mt-16 scroll-mt-24">
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">Wichtige Begriffe</p>
        <h2 className="mt-2 font-serif text-[26px] leading-tight text-bank-text sm:text-[32px]">Glossar zum Thema</h2>
      </div>
      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((it, i) => (
          <div
            key={i}
            className="rounded-xl border border-bank-border bg-white p-5"
            data-testid={`strategie-term-${i}`}
          >
            <dt className="font-serif text-[15px] text-bank-text">{it.term}</dt>
            <dd className="mt-1.5 text-[13.5px] leading-relaxed text-bank-text-muted">{it.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

/** ═══ Deep Learn (accordion) ═══ */
const DeepLearnItem = ({ q, a, idx }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-bank-border py-4" data-testid={`strategie-deeplearn-${idx}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <span className="font-serif text-[15.5px] text-bank-text">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-bank-primary transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.8} aria-hidden />
      </button>
      {open && <p className="mt-3 text-[13.5px] leading-relaxed text-bank-text-muted">{a}</p>}
    </div>
  );
};

export const StrategyDeepLearn = ({ items = [] }) => {
  if (!items.length) return null;
  return (
    <section id="wissen-vertiefen" className="mt-16 scroll-mt-24">
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">Wissen vertiefen</p>
        <h2 className="mt-2 font-serif text-[26px] leading-tight text-bank-text sm:text-[32px]">Häufige Detailfragen zum Thema</h2>
      </div>
      <div className="mt-4 border-t border-bank-border">
        {items.map((it, i) => <DeepLearnItem key={i} idx={i} q={it.q} a={it.a} />)}
      </div>
    </section>
  );
};

/** ═══ Passende News (dynamic) ═══ */
const matchesTopicKeywords = (article, keywords) => {
  if (!Array.isArray(keywords) || keywords.length === 0) return false;
  const hay = `${article.title || ''} ${article.excerpt || ''} ${article.category || ''} ${article.slug || ''}`.toLowerCase();
  return keywords.some((k) => hay.includes(k.toLowerCase()));
};

export const StrategyNewsSection = ({ topicSlug, keywords = [], topicTitle }) => {
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading'); // loading | done | error
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/content/news?limit=50`);
        if (!res.ok) throw new Error(String(res.status));
        const all = await res.json();
        if (!alive) return;
        const filtered = (Array.isArray(all) ? all : [])
          .filter((a) => matchesTopicKeywords(a, keywords))
          .slice(0, 4);
        setItems(filtered);
        setState('done');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => { alive = false; };
  }, [topicSlug, keywords]);

  if (state === 'loading') {
    return (
      <section id="aktuelle-einblicke" className="mt-16 scroll-mt-24" data-testid="strategie-news">
        <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">Aktuelle Einblicke</p>
        <h2 className="mt-2 font-serif text-[26px] leading-tight text-bank-text sm:text-[32px]">Passende aktuelle Beiträge</h2>
        <div className="mt-6 h-24 animate-pulse rounded-xl border border-bank-border bg-bank-primary/[0.02]" />
      </section>
    );
  }
  return (
    <section id="aktuelle-einblicke" className="mt-16 scroll-mt-24" data-testid="strategie-news">
      <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">Aktuelle Einblicke</p>
      <h2 className="mt-2 font-serif text-[26px] leading-tight text-bank-text sm:text-[32px]">Passende aktuelle Beiträge</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-[13.5px] italic text-bank-text-muted" data-testid="strategie-news-empty">
          Aktuell keine passenden Beiträge zum Thema {topicTitle || 'dieser Strategie'} verfügbar.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((n) => (
            <li key={n.id || n.slug}>
              <Link
                to={`/news/${n.slug}`}
                data-testid={`strategie-news-item-${n.slug}`}
                className="group block rounded-xl border border-bank-border bg-white p-5 transition-colors hover:border-bank-primary/40"
              >
                <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.18em] text-bank-primary">
                  <span>{n.category || 'markt'}</span>
                  {n.published_at ? <span className="text-bank-text-muted">· {n.published_at.slice(0, 10)}</span> : null}
                </div>
                <p className="mt-2 font-serif text-[15.5px] leading-snug text-bank-text">{n.title}</p>
                {n.excerpt ? (
                  <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-bank-text-muted">{n.excerpt}</p>
                ) : null}
                <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] text-bank-primary underline-offset-4 group-hover:underline">
                  Artikel lesen
                  <ArrowRight className="h-3 w-3" strokeWidth={1.8} aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/** ═══ Conversation Questions ═══ */
export const StrategyConversationQuestions = ({ items = [] }) => {
  if (!items.length) return null;
  return (
    <section id="fragen-fuer-gespraech" className="mt-16 scroll-mt-24">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-bank-primary" strokeWidth={1.8} aria-hidden />
        <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">Für ein persönliches Gespräch</p>
      </div>
      <h2 className="mt-2 font-serif text-[26px] leading-tight text-bank-text sm:text-[32px]">
        Diese Fragen können Sie in einem persönlichen Gespräch ansprechen
      </h2>
      <ul className="mt-6 space-y-3">
        {items.map((q, i) => (
          <li
            key={i}
            data-testid={`strategie-conv-question-${i}`}
            className="flex items-start gap-3 rounded-xl border border-bank-border bg-white p-4"
          >
            <span
              aria-hidden
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-bank-primary/25 bg-bank-primary/[0.05] font-mono text-[11px] font-semibold text-bank-primary"
            >
              {i + 1}
            </span>
            <p className="text-[14px] leading-relaxed text-bank-text">{q}</p>
          </li>
        ))}
      </ul>
    </section>
  );
};

/** ═══ Strategy Report Download (PDF) ═══ */
export const StrategyReportDownload = ({ category, topic, premium }) => {
  const [state, setState] = useState('idle'); // idle | loading | error
  const handleDownload = async () => {
    setState('loading');
    try {
      const res = await fetch(`${API}/reports/strategy-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_slug: category.slug,
          category_title: category.title,
          topic_slug: topic.slug,
          topic_title: topic.title,
          intro: topic.intro,
          summary: premium.summary,
          key_takeaways: premium.keyTakeaways || [],
          quick_facts: premium.quickFacts || [],
          how_it_works: premium.howItWorks || [],
          aspects: (premium.aspects || []).map((a) => ({ title: a.title, body: a.body })),
          advantages: premium.advantages || [],
          considerations: premium.considerations || [],
          self_check_options: (premium.selfCheck?.options || []).map((o) => o.label),
          related: (premium.related || []).map((r) => r.label),
          conversation_questions: premium.conversationQuestions || [],
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `froehlich-${topic.slug}-kompakt.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setState('idle');
    } catch {
      setState('error');
    }
  };
  return (
    <section id="merkblatt" className="mt-16 scroll-mt-24">
      <div className="rounded-2xl border border-bank-border bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">Merkblatt zum Thema</p>
            <h2 className="mt-2 font-serif text-[22px] leading-snug text-bank-text sm:text-[26px]">
              {topic.title} kompakt
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-bank-text-muted">
              Grundlagen, wichtige Aspekte, Risiken und Fragen für das persönliche Gespräch — als PDF zum Ausdrucken.
            </p>
            {state === 'error' ? (
              <p className="mt-3 text-[12.5px] text-red-600" role="alert">
                Der Download ist aktuell nicht möglich. Bitte versuchen Sie es später erneut.
              </p>
            ) : null}
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              disabled={state === 'loading'}
              data-testid="strategie-report-download"
              className="inline-flex items-center gap-2 rounded-full bg-bank-primary px-5 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-bank-primary/90 disabled:opacity-70"
            >
              <Download className="h-4 w-4" strokeWidth={1.7} aria-hidden />
              {state === 'loading' ? 'PDF wird erstellt …' : 'Merkblatt herunterladen'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
