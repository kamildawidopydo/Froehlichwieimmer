import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getApiBase } from '@/lib/apiBase';
import PageMeta from '@/components/PageMeta';
import CountryFlagIcon from '@/components/CountryFlagIcon';
import { getCountryLabelDe, getCountryIso } from '@/lib/countryFlags';

/**
 * Session 93 · Phase 4 — Länder-Landingpages.
 * Routen:
 *   /tagesgeld/:country
 *   /festgeld/:country
 * Inhalte dynamisch aus Datenbank/Facets.
 */
const COUNTRY_SLUG_TO_CODE = {
  deutschland: 'DE', oesterreich: 'AT', niederlande: 'NL', belgien: 'BE',
  frankreich: 'FR', spanien: 'ES', italien: 'IT', portugal: 'PT',
  irland: 'IE', luxemburg: 'LU', estland: 'EE', lettland: 'LV',
  litauen: 'LT', finnland: 'FI', schweden: 'SE',
};

export default function CountryLandingPage({ productType }) {
  const { country: countrySlug } = useParams();
  const navigate = useNavigate();
  const cc = COUNTRY_SLUG_TO_CODE[countrySlug?.toLowerCase()];
  const [offers, setOffers] = useState([]);
  const [facets, setFacets] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cc) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const api = getApiBase();
      try {
        const [off, fac] = await Promise.all([
          fetch(`${api}/api/public/savings-offers?product_type=${productType}&countries=${cc}&limit=200`, { credentials: 'include' }).then(r => r.json()),
          fetch(`${api}/api/public/savings-offers/facets?product_type=${productType}`, { credentials: 'include' }).then(r => r.json()),
        ]);
        setOffers(off?.items || []);
        setFacets(fac);
      } finally { setLoading(false); }
    })();
  }, [cc, productType]);

  if (!cc) {
    return (
      <div className="mx-auto max-w-[900px] p-10 text-center">
        <p className="font-display text-2xl">Land nicht bekannt.</p>
        <Link to="/comparison" className="mt-4 inline-block text-bank-primary underline">Zum Vergleich</Link>
      </div>
    );
  }

  const bestRate = offers.length ? Math.max(...offers.map((o) => o.interest_rate || 0)) : null;
  const uniqueBanks = new Set(offers.map((o) => o.bank_slug)).size;
  const label = productType === 'festgeld' ? 'Festgeld' : 'Tagesgeld';
  const countryName = getCountryLabelDe(cc);
  const isDemo = offers.some((o) => o.is_demo);

  return (
    <div className="min-h-screen bg-bank-bg pb-24">
      <PageMeta
        title={`${label} in ${countryName}`}
        description={`${label}-Angebote von Banken in ${countryName} im Vergleich.`}
        path={`/${productType}/${countrySlug}`}
        noindex={isDemo}
      />
      <section className="border-b border-bank-border bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:px-12">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">Länderseite</p>
          <h1 className="mt-1 flex items-center gap-3 font-display text-display-md font-light text-bank-text">
            <CountryFlagIcon country={cc} size="lg" />
            {label} in {countryName}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] text-bank-text-muted">
            Übersicht der {offers.length} {label}-Angebote von {uniqueBanks} Banken mit Sitz in {countryName}.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Banken" value={uniqueBanks} />
            <Stat label="Angebote" value={offers.length} />
            {bestRate != null && <Stat label="Höchster Zins" value={`${bestRate.toFixed(2).replace('.', ',')} %`} />}
            <Stat label="Einlagensicherung" value="100.000 €" />
          </div>
          {isDemo && (
            <p className="mt-4 inline-block border-l-2 border-bank-gold bg-bank-gold/10 px-3 py-2 text-[12px] text-bank-text">
              Enthält aktuell <strong>Demo-Konditionen</strong> — keine Live-Marktdaten.
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:px-12">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse border border-bank-border bg-white" />
            ))}
          </div>
        ) : offers.length === 0 ? (
          <div className="border border-bank-border bg-white p-10 text-center text-bank-text-muted">
            Für dieses Land liegen derzeit keine {label}-Angebote vor.
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map((o) => (
              <div key={o.id} className="flex items-center gap-4 border border-bank-border bg-white p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-bank-text">{o.banks?.name}</p>
                  <p className="text-[11.5px] text-bank-text-muted">
                    {o.term_months ? `${o.term_months} M · ` : 'flex · '}min. {o.min_amount != null ? `${o.min_amount.toLocaleString('de-DE')} €` : '—'}
                    {o.is_demo && <span className="ml-2 font-mono uppercase tracking-[0.16em] text-bank-gold">Demo</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="rate-figure text-xl font-semibold text-bank-primary" data-numeric>{(o.interest_rate || 0).toFixed(2).replace('.', ',')} %</p>
                  <button
                    type="button"
                    onClick={() => navigate(`/comparison?compare=${o.id}`)}
                    className="mt-1 text-[11px] text-bank-text-muted underline underline-offset-4 hover:text-bank-primary"
                  >Zum Vergleich</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border border-bank-border bg-bank-bg p-4">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">{label}</p>
      <p className="mt-1 rate-figure text-xl text-bank-primary" data-numeric>{value}</p>
    </div>
  );
}
