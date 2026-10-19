import React from 'react';
import { RESEARCH_FORMATS, formatAccent } from '@/design-system/newsroom';

/**
 * Session 80.48 — Reusable Newsroom-Format-Badge.
 * Klein, mono-uppercase, keine bunte SaaS-Pill. Zentrale Accent-API only.
 */
export const FormatBadge = ({ format = 'news', className = '' }) => {
  const meta = RESEARCH_FORMATS[format] || RESEARCH_FORMATS.news;
  const acc = formatAccent(format);
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] ${acc.tag} ${className}`}
      data-testid={`newsroom-format-${meta.key}`}
      aria-label={`Format: ${meta.label}`}
    >
      {meta.shortLabel}
    </span>
  );
};

/**
 * Editorial Story-Meta-Zeile: CATEGORY · SOURCE · TIME.
 * Fehlende Werte werden stumm ausgeblendet — keine Fake-Metadaten.
 */
export const StoryMeta = ({ category, source, time, readingTime, className = '' }) => {
  const parts = [];
  if (category) parts.push({ key: 'cat', text: String(category).toUpperCase(), strong: true });
  if (source)   parts.push({ key: 'src', text: source });
  if (time)     parts.push({ key: 'time', text: time });
  if (readingTime) parts.push({ key: 'read', text: readingTime });
  if (parts.length === 0) return null;
  return (
    <p
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted ${className}`}
      data-testid="newsroom-story-meta"
    >
      {parts.map((p, i) => (
        <React.Fragment key={p.key}>
          {i > 0 && <span aria-hidden className="text-bank-text-muted/40">·</span>}
          <span className={p.strong ? 'text-bank-text' : ''}>{p.text}</span>
        </React.Fragment>
      ))}
    </p>
  );
};

export default FormatBadge;
