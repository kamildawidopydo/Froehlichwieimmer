import React, { useState } from 'react';
import { Star, ShieldCheck } from 'lucide-react';

// Dunkelblaue Initialen auf hellem neutralem Grund — Trustpilot-Stil, dezent.
const initialsOf = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '••';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Stars = ({ rating }) => (
  <div className="flex gap-0.5" aria-label={`${rating} von 5 Sternen`} data-testid="review-stars">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} size={13} strokeWidth={0} className={n <= rating ? 'fill-bank-gold text-bank-gold' : 'fill-neutral-300 text-neutral-300'} />
    ))}
  </div>
);

const kundeSeit = (review) => {
  if (review?.customer_since) return `Kunde seit ${review.customer_since}`;
  if (!review?.created_at) return null;
  const y = new Date(review.created_at).getFullYear();
  if (!y || Number.isNaN(y)) return null;
  return `Kunde seit ${y}`;
};

// Erste vollständige Satzhälfte als Überschrift extrahieren (max 68 Zeichen).
const headlineOf = (text) => {
  if (!text) return '';
  const s = String(text).trim();
  const dot = s.search(/[.!?—](\s|$)/);
  const raw = dot > 8 ? s.slice(0, dot).trim() : s;
  return raw.length > 68 ? raw.slice(0, 66).trim() + '…' : raw;
};

const bodyOf = (text) => {
  if (!text) return '';
  const s = String(text).trim();
  const dot = s.search(/[.!?—](\s|$)/);
  if (dot > 8 && dot < s.length - 1) return s.slice(dot + 1).trim();
  return s;
};

const CompactReviewCard = ({ review }) => {
  const [expanded, setExpanded] = useState(false);
  if (!review) return null;
  const name = review.display_name || 'Kundin/Kunde';
  const initials = initialsOf(name);
  const headline = headlineOf(review.text);
  const body = bodyOf(review.text);
  const seit = kundeSeit(review);
  const showToggle = (body || '').length > 260;
  // Nur zeigen, wenn Backend explizit is_verified=true liefert — niemals fabrizieren.
  const verified = review.is_verified === true;
  return (
    <article
      className="flex h-full flex-col border border-bank-border bg-white p-5 transition-shadow hover:shadow-editorial-sm"
      data-testid={`compact-review-${review.id}`}
    >
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-mono text-[11.5px] font-medium tracking-wide text-bank-primary"
        >
          {initials}
        </div>
        <Stars rating={Number(review.rating) || 5} />
        {verified && (
          <span
            className="ml-auto inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.14em] text-emerald-700"
            data-testid="compact-review-verified"
            title="Bewertung von einem verifizierten Kundenkonto"
          >
            <ShieldCheck size={11} strokeWidth={2} /> Verifiziert
          </span>
        )}
      </div>
      {headline && (
        <h3 className="mt-3 font-serif text-[16px] font-medium leading-snug text-bank-text">
          {headline}
        </h3>
      )}
      <p className={`mt-2 text-[13.5px] leading-relaxed text-bank-text-muted ${expanded ? '' : 'line-clamp-4'}`} data-testid="compact-review-body">
          „{body}"
      </p>
      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 self-start text-[12px] text-bank-primary underline-offset-4 hover:underline"
          data-testid="compact-review-toggle"
        >
          {expanded ? 'weniger anzeigen' : '… mehr lesen'}
        </button>
      )}
      <div className="mt-auto pt-4">
        <p className="text-[13px] font-medium text-bank-text">{name}</p>
        {seit && <p className="text-[11.5px] uppercase tracking-[0.14em] text-bank-text-muted">{seit}</p>}
      </div>
    </article>
  );
};

export default CompactReviewCard;

// Erste vollständige Satzhälfte als Überschrift extrahieren (max 68 Zeichen).
const headlineOf = (text) => {
  if (!text) return '';
  const s = String(text).trim();
  const dot = s.search(/[.!?—](\s|$)/);
  const raw = dot > 8 ? s.slice(0, dot).trim() : s;
  return raw.length > 68 ? raw.slice(0, 66).trim() + '…' : raw;
};

const bodyOf = (text) => {
  if (!text) return '';
  const s = String(text).trim();
  const dot = s.search(/[.!?—](\s|$)/);
  if (dot > 8 && dot < s.length - 1) return s.slice(dot + 1).trim();
  return s;
};

const CompactReviewCard = ({ review }) => {
  const [expanded, setExpanded] = useState(false);
  if (!review) return null;
  const name = review.display_name || 'Kundin/Kunde';
  const initials = initialsOf(name);
  const headline = headlineOf(review.text);
  const body = bodyOf(review.text);
  const seit = kundeSeit(review.created_at);
  const showToggle = (body || '').length > 260;
  // Nur zeigen, wenn Backend explizit is_verified=true liefert — niemals fabrizieren.
  const verified = review.is_verified === true;
  return (
    <article
      className="flex h-full flex-col border border-bank-border bg-white p-5 transition-shadow hover:shadow-editorial-sm"
      data-testid={`compact-review-${review.id}`}
    >
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-mono text-[11.5px] font-medium tracking-wide text-bank-primary"
        >
          {initials}
        </div>
        <Stars rating={Number(review.rating) || 5} />
        {verified && (
          <span
            className="ml-auto inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.14em] text-emerald-700"
            data-testid="compact-review-verified"
            title="Bewertung von einem verifizierten Kundenkonto"
          >
            <ShieldCheck size={11} strokeWidth={2} /> Verifiziert
          </span>
        )}
      </div>
      {headline && (
        <h3 className="mt-3 font-serif text-[16px] font-medium leading-snug text-bank-text">
          {headline}
        </h3>
      )}
      <p className={`mt-2 text-[13.5px] leading-relaxed text-bank-text-muted ${expanded ? '' : 'line-clamp-4'}`} data-testid="compact-review-body">
          „{body}"
      </p>
      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 self-start text-[12px] text-bank-primary underline-offset-4 hover:underline"
          data-testid="compact-review-toggle"
        >
          {expanded ? 'weniger anzeigen' : '… mehr lesen'}
        </button>
      )}
      <div className="mt-auto pt-4">
        <p className="text-[13px] font-medium text-bank-text">{name}</p>
        {seit && <p className="text-[11.5px] uppercase tracking-[0.14em] text-bank-text-muted">{seit}</p>}
      </div>
    </article>
  );
};

export default CompactReviewCard;
