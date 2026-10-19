import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApiBase } from '@/lib/apiBase';
import BankLogo from '@/components/bank/BankLogo';
import CountryFlagIcon from '@/components/CountryFlagIcon';
import PageMeta from '@/components/PageMeta';
import { getCountryLabelDe } from '@/lib/countryFlags';
import { formatEur } from '@/lib/savingsCalculator';

/**
 * Session 93 · Phase 4 — Bank-Detailseite /banken/:slug.
 */
export default function BankDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`${getApiBase()}/api/public/banks/${encodeURIComponent(slug)}`, { credentials: 'include' });
        const d = await r.json();
        setData(d);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return <div className="mx-auto max-w-[1200px] p-10"><div className="h-40 animate-pulse bg-white border border-bank-border" /></div>;
  }
  if (!data?.bank) {
    return (
      <div className="mx-auto max-w-[900px] p-10 text-center">
        <p className="font-display text-2xl">Bank nicht gefunden.</p>
        <Link to="/banken" className="mt-4 inline-block text-bank-primary underline">Zurück zum Verzeichnis</Link>
      </div>
    );
  }
  const b = data.bank;
  const tages = data.offers.filter((o) => o.product_type === 'tagesgeld');
  const fest = data.offers.filter((o) => o.product_type === 'festgeld');

  return (
    <div className="min-h-screen bg-bank-bg pb-24">
      <PageMeta title={`${b.name} · Sparangebote`} description={`Sparangebote von ${b.name}`} path={`/banken/${b.slug}`} />
      <section className="border-b border-bank-border bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:px-12">
          <Link to="/banken" className="mb-4 inline-block font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted hover:text-bank-primary">← Verzeichnis</Link>
          <div className="flex flex-wrap items-center gap-4">
            <BankLogo bank={b} size={64} />
            <div>
              <h1 className="font-display text-display-md font-light text-bank-text">{b.name}</h1>
              <p className="mt-1 flex items-center gap-2 text-[13px] text-bank-text-muted">
                <CountryFlagIcon country={b.country_code} size="xs" />
                {getCountryLabelDe(b.country_code) || b.country}
                {b.founded_year && <span>· seit {b.founded_year}</span>}
                {b.regulator_name && <span>· Regulator: {b.regulator_name}</span>}
            </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="space-y-8">
            {tages.length > 0 && (
              <section>
                <h2 className="mb-4 font-display text-2xl font-light text-bank-text">Tagesgeld ({tages.length})</h2>
                <div className="space-y-3">
                  {tages.map((o) => <OfferRow key={o.id} o={o} />)}
                </div>
              </section>
            )}
            {fest.length > 0 && (
              <section>
                <h2 className="mb-4 font-display text-2xl font-light text-bank-text">Festgeld ({fest.length})</h2>
                <div className="space-y-3">
                  {fest.map((o) => <OfferRow key={o.id} o={o} />)}
                </div>
              </section>
            )}
            {data.offers.length === 0 && (
              <div className="border border-bank-border bg-white p-8 text-center text-bank-text-muted">
                Für diese Bank sind derzeit keine Angebote hinterlegt.
              </div>
            )}
          </main>
          <aside className="space-y-4">
            <div className="border border-bank-border bg-white p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">Einlagensicherung</p>
              <p className="mt-2 text-[14px] text-bank-text">
                Bis <strong>{(b.deposit_protection_amount || '€100.000').replace('€', '').trim() || '100.000 €'}</strong>{' '}
                nach dem System in{' '}
                <span className="inline-flex items-center gap-1.5">
                  <CountryFlagIcon country={b.deposit_guarantee_country_code || b.country_code} size="xs" />
                  {getCountryLabelDe(b.deposit_guarantee_country_code || b.country_code)}
                </span>
                .
              </p>
              {b.deposit_protection && <p className="mt-2 text-[11.5px] text-bank-text-muted">{b.deposit_protection}</p>}
            </div>
            {b.legal_name && (
              <div className="border border-bank-border bg-white p-5">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Rechtsträger</p>
                <p className="mt-2 text-[13px] text-bank-text">{b.legal_name}</p>
                {b.website_url && <a href={b.website_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[12px] text-bank-primary underline">Zur Bank-Website</a>}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function OfferRow({ o }) {
  return (
    <div className="flex items-center gap-4 border border-bank-border bg-white p-4" data-testid={`bank-detail-offer-${o.id}`}>
      <div className="flex-1 min-w-0">
        <p className="truncate text-[14px] font-medium text-bank-text">{o.product_name || o.product_type}</p>
        <p className="mt-0.5 text-[11.5px] text-bank-text-muted">
          {o.term_months ? `${o.term_months} Monate` : 'flexibel'} · min. {o.min_amount != null ? `${o.min_amount.toLocaleString('de-DE')} €` : '—'}
        </p>
      </div>
      <div className="text-right">
        <p className="rate-figure text-xl font-semibold text-bank-primary" data-numeric>
          {(o.interest_rate ?? 0).toFixed(2).replace('.', ',')}
          <span className="ml-0.5 font-mono text-xs text-bank-gold">%</span>
        </p>
        <Link to={`/comparison?compare=${o.id}`} className="mt-1 inline-block text-[11px] text-bank-text-muted underline underline-offset-4 hover:text-bank-primary">
          Details
        </Link>
      </div>
    </div>
  );
}
