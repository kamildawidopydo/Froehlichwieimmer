import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { getApiBase } from '@/lib/apiBase';
import BankLogo from '@/components/bank/BankLogo';
import CountryFlagIcon from '@/components/CountryFlagIcon';
import PageMeta from '@/components/PageMeta';
import { getCountryLabelDe } from '@/lib/countryFlags';
import { cn } from '@/lib/utils';

/**
 * Session 93 · Phase 4 — Bankverzeichnis /banken.
 * Zeigt alle Banken mit Anzahl aktiver Angebote, Land, Suche und
 * Länderfilter. Kein künstliches Rating.
 */
const ALPHABET = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

const PRODUCT_TABS = [
  { code: '', label: 'Alle' },
  { code: 'tagesgeld', label: 'Tagesgeld' },
  { code: 'festgeld', label: 'Festgeld' },
];

export default function BankDirectory() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [type, setType] = useState('');
  const [letter, setLetter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${getApiBase()}/api/public/banks`, { credentials: 'include' });
        const d = await r.json();
        setBanks(d.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const countries = useMemo(() => {
    const map = new Map();
    for (const b of banks) {
      if (!b.country_code) continue;
      map.set(b.country_code, (map.get(b.country_code) || 0) + 1);
    }
    return [...map.entries()].map(([code, c]) => ({ code, count: c })).sort((a, b) => -a.count + b.count);
  }, [banks]);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return banks.filter((b) => {
      if (country && b.country_code !== country) return false;
      if (letter && (b.name || '')[0]?.toUpperCase() !== letter) return false;
      if (qLower) {
        const hay = (b.name + ' ' + (b.legal_name || '')).toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      // type filter is client-side hint; requires offer_count > 0 for now
      if (type && b.offer_count === 0) return false;
      return true;
    });
  }, [banks, q, country, type, letter]);

  return (
    <div className="min-h-screen bg-bank-bg pb-24">
      <PageMeta title="Bankverzeichnis" description="Alle im Vergleich verfügbaren Banken auf einen Blick." path="/banken" />
      <section className="border-b border-bank-border bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">Verzeichnis</p>
          <h1 className="mt-1 font-display text-display-lg font-light text-bank-text">Banken im Vergleich</h1>
          <p className="mt-3 max-w-2xl text-[15px] text-bank-text-muted">
            Übersicht aller {banks.length} Institute — sortiert nach Sitzland. Klick auf eine Bank öffnet
            deren Angebote.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-12">
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">
              Suche
            </label>
            <Input data-testid="bank-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="z. B. ING" className="h-10 rounded-none border-bank-border" />
          </div>
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Produkttyp</p>
            <div className="flex gap-2">
              {PRODUCT_TABS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  data-testid={`bank-type-${t.code || 'all'}`}
                  onClick={() => setType(t.code)}
                  className={cn(
                    'flex-1 border px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em]',
                    type === t.code ? 'border-bank-ink bg-bank-ink text-white' : 'border-bank-border text-bank-text-muted hover:border-bank-primary'
                  )}
                >{t.label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Land</p>
            <div className="grid max-h-72 grid-cols-1 gap-1 overflow-y-auto">
              <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-bank-text">
                <input type="radio" checked={country === ''} onChange={() => setCountry('')} />
                Alle Länder
                <span className="ml-auto font-mono text-[10.5px] text-bank-text-muted">{banks.length}</span>
              </label>
              {countries.map((c) => (
                <label key={c.code} className="flex cursor-pointer items-center gap-2 text-[12.5px] text-bank-text">
                  <input type="radio" data-testid={`bank-country-${c.code}`} checked={country === c.code} onChange={() => setCountry(c.code)} />
                  <CountryFlagIcon country={c.code} size="xs" />
                  {getCountryLabelDe(c.code) || c.code}
                  <span className="ml-auto font-mono text-[10.5px] text-bank-text-muted">{c.count}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Alphabet</p>
            <div className="flex flex-wrap gap-1">
              <button type="button" onClick={() => setLetter('')} className={cn('h-7 min-w-[24px] border px-1 text-[10.5px] font-mono', letter === '' ? 'border-bank-ink bg-bank-ink text-white' : 'border-bank-border')}>·</button>
              {ALPHABET.map((L) => (
                <button key={L} type="button" onClick={() => setLetter(L)} className={cn('h-7 min-w-[24px] border px-1 text-[10.5px] font-mono', letter === L ? 'border-bank-ink bg-bank-ink text-white' : 'border-bank-border text-bank-text-muted hover:border-bank-primary')}>{L}</button>
              ))}
            </div>
          </div>
        </aside>

        <main>
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse border border-bank-border bg-white" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="border border-bank-border bg-white p-10 text-center text-bank-text-muted">
              Keine Banken für diese Filter gefunden.
            </div>
          ) : (
            <>
              <p className="mb-4 text-[13px] text-bank-text-muted"><strong className="text-bank-text">{filtered.length}</strong> Institute</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((b) => (
                  <Link key={b.slug} to={`/banken/${b.slug}`} data-testid={`bank-card-${b.slug}`} className="group flex items-center gap-3 border border-bank-border bg-white p-4 transition-colors hover:border-bank-primary">
                    <BankLogo bank={b} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[15px] font-medium text-bank-text group-hover:text-bank-primary">{b.name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-bank-text-muted">
                        <CountryFlagIcon country={b.country_code} size="xs" />
                        {getCountryLabelDe(b.country_code) || b.country}
                        <span aria-hidden>·</span>
                        <span>{b.offer_count} Angebote</span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
