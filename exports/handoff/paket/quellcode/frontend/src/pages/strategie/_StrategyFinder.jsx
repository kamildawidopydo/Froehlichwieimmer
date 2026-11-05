import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { goals, findGoal, resolveFinderResults } from '@/data/strategieGoals';
import { findTopic } from '@/data/strategieContent';

const StrategyFinder = () => {
  const [goalSlug, setGoalSlug] = useState(null);
  const [focusKey, setFocusKey] = useState(null);
  const goal = goalSlug ? findGoal(goalSlug) : null;

  const results = useMemo(() => {
    if (!goalSlug || !focusKey) return [];
    return resolveFinderResults(goalSlug, focusKey)
      .map((r) => {
        const f = findTopic(r.category, r.topic);
        return f ? { ...r, ...f } : null;
      })
      .filter(Boolean);
  }, [goalSlug, focusKey]);

  const reset = () => { setGoalSlug(null); setFocusKey(null); };

  return (
    <section
      className="mt-20 border border-bank-border bg-white p-6 sm:p-10"
      data-testid="strategy-finder"
      aria-label="Strategy Finder"
    >
      <p className="text-[10.5px] uppercase tracking-[0.24em] text-bank-primary">Strategy Finder</p>
      <h2 className="mt-2 font-serif text-3xl leading-tight text-bank-text">Was beschäftigt Sie gerade?</h2>
      <p className="mt-3 max-w-2xl text-[14px] text-bank-text-muted">
        In zwei Schritten zu einer Auswahl passender Themen für Ihre weitere Orientierung.
        Keine individuelle Anlageempfehlung — nur eine Vorauswahl relevanter Inhalte.
      </p>

      {/* SCHRITT 1 */}
      <div className="mt-8" data-testid="finder-step-1">
        <p className="text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">Schritt 1</p>
        <h3 className="mt-1 font-serif text-lg text-bank-text">Was möchten Sie hauptsächlich erreichen?</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {goals.map((g) => (
            <button
              key={g.slug}
              type="button"
              onClick={() => { setGoalSlug(g.slug); setFocusKey(null); }}
              data-testid={`finder-goal-${g.slug}`}
              className={`rounded-full border px-4 py-2 text-[13px] transition-colors ${
                goalSlug === g.slug
                  ? 'border-bank-primary bg-bank-primary text-white'
                  : 'border-bank-border bg-white text-bank-text hover:border-bank-primary/60'
              }`}
              aria-pressed={goalSlug === g.slug}
            >
              {g.title}
            </button>
          ))}
        </div>
      </div>

      {/* SCHRITT 2 */}
      {goal && (
        <div className="mt-8" data-testid="finder-step-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">Schritt 2</p>
          <h3 className="mt-1 font-serif text-lg text-bank-text">Was ist Ihnen dabei besonders wichtig?</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {goal.focusOptions.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFocusKey(f.key)}
                data-testid={`finder-focus-${f.key}`}
                className={`rounded-full border px-4 py-2 text-[13px] transition-colors ${
                  focusKey === f.key
                    ? 'border-bank-primary bg-bank-primary text-white'
                    : 'border-bank-border bg-white text-bank-text hover:border-bank-primary/60'
                }`}
                aria-pressed={focusKey === f.key}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ERGEBNIS */}
      {results.length > 0 && (
        <div className="mt-10 border-t border-bank-border pt-8" data-testid="finder-results">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-serif text-2xl text-bank-text">Passende Themen für Sie</h3>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 text-[12px] text-bank-text-muted hover:text-bank-primary"
              data-testid="finder-reset"
            >
              <RotateCcw size={12} strokeWidth={1.8} />
              Auswahl zurücksetzen
            </button>
          </div>
          <p className="mt-2 text-[12.5px] italic text-bank-text-muted">
            Diese Themen könnten für Ihre weitere Orientierung interessant sein. Sie ersetzen keine individuelle Beratung.
          </p>
          <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {results.map((r) => (
              <li key={`${r.category.slug}-${r.topic.slug}`} className="border border-bank-border bg-white p-5">
                <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">{r.category.title}</p>
                <p className="mt-1 font-serif text-lg text-bank-text">{r.topic.title}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-bank-text-muted">
                  {r.topic.intro.split('.').slice(0, 1).join('.') + '.'}
                </p>
                <Link
                  to={`/strategie/${r.category.slug}/${r.topic.slug}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-bank-primary underline-offset-4 hover:underline"
                  data-testid={`finder-result-${r.topic.slug}`}
                >
                  Thema ansehen <ArrowRight size={14} strokeWidth={1.8} />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link
              to="/#home-product-wizard"
              className="inline-flex items-center gap-2 rounded-full border border-bank-primary bg-white px-5 py-2 text-[13px] font-medium text-bank-primary hover:bg-bank-primary hover:text-white"
              data-testid="finder-cta"
            >
              Persönlich besprechen
              <ArrowRight size={14} strokeWidth={1.8} />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
};

export default StrategyFinder;
