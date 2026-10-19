import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { NEWS_CATEGORIES } from '@/lib/news/euronewsFeeds';
import HighlightText from '@/components/news/HighlightText';

const PublicNewsSearchBar = ({
  value,
  onChange,
  placeholder,
  recentSearches = [],
  onSelectRecent,
  onRemember,
  onCategoryPick,
  showSuggestions = false,
  suggestions = [],
  suggestionsLoading = false,
  onSelectSuggestion,
}) => {
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && value?.trim()) {
      onRemember?.(value.trim());
      setFocused(false);
    }
  };

  const showPanel = focused && showSuggestions;
  const trimmed = value?.trim() ?? '';
  const showArticleSuggestions = trimmed.length >= 2;

  return (
    <div ref={wrapRef} className="relative w-full">
      <Search
        size={15}
        strokeWidth={1.5}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-bank-text-muted"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Nachrichten durchsuchen…'}
        aria-label="Nachrichten durchsuchen"
        className="w-full rounded-lg border border-bank-border/80 bg-bank-surface py-3 pl-10 pr-10 text-sm text-bank-text shadow-sm placeholder:text-bank-text-muted/70 transition-colors focus:border-bank-gold/45 focus:outline-none focus:ring-2 focus:ring-bank-accent/25 dark:bg-bank-ink/40"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange?.('')}
          aria-label="Suche zurücksetzen"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-bank-text-muted transition-colors hover:bg-bank-bg/60 hover:text-bank-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      )}

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-xl border border-bank-border/70 bg-bank-surface p-3 shadow-lg dark:bg-bank-ink">
          {showArticleSuggestions && (
            <div className="mb-3">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-bank-text-muted">
                Vorschläge
              </p>
              {suggestionsLoading && suggestions.length === 0 ? (
                <p className="text-[12px] text-bank-text-muted">Wird geladen…</p>
              ) : suggestions.length > 0 ? (
                <ul className="space-y-1">
                  {suggestions.map((item) => (
                    <li key={item.slug}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSuggestion?.(item.title);
                          onRemember?.(item.title);
                          setFocused(false);
                        }}
                        className="w-full rounded-lg px-2.5 py-2 text-left text-[13px] text-bank-text transition-colors hover:bg-bank-bg/60 hover:text-bank-gold"
                      >
                        <HighlightText text={item.title} query={trimmed} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-bank-text-muted">Keine Vorschläge</p>
              )}
            </div>
          )}
          {recentSearches.length > 0 && (
            <div className="mb-3">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-bank-text-muted">
                Zuletzt gesucht
              </p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      onSelectRecent?.(term);
                      onRemember?.(term);
                      setFocused(false);
                    }}
                    className="rounded-full border border-bank-border/70 px-3 py-1 text-[12px] text-bank-text transition-colors hover:border-bank-gold/40 hover:text-bank-gold"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-bank-text-muted">
              Kategorien
            </p>
            <div className="flex flex-wrap gap-2">
              {NEWS_CATEGORIES.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => {
                    onCategoryPick?.(cat.slug);
                    setFocused(false);
                  }}
                  className="rounded-full border border-bank-border/70 px-3 py-1 text-[12px] text-bank-text-muted transition-colors hover:border-bank-gold/40 hover:text-bank-gold"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicNewsSearchBar;
