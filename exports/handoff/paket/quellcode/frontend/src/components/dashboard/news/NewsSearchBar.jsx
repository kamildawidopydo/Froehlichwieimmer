import React from 'react';
import { Search, X } from 'lucide-react';

const NewsSearchBar = ({ value, onChange, placeholder }) => (
  <div className="relative w-full">
    <Search
      size={14}
      strokeWidth={1.5}
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted"
    />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder ?? 'Nachrichten durchsuchen…'}
      aria-label="Nachrichten durchsuchen"
      className="w-full border border-bank-border bg-white py-2.5 pl-9 pr-9 text-sm text-bank-text placeholder:text-bank-text-muted/75 focus:border-bank-gold/55 focus:outline-none focus:ring-2 focus:ring-bank-accent/35"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange?.('')}
        aria-label="Suche zurücksetzen"
        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center text-bank-text-muted transition-colors hover:bg-bank-bg/45 hover:text-bank-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
      >
        <X size={13} strokeWidth={1.5} />
      </button>
    )}
  </div>
);

export default NewsSearchBar;
