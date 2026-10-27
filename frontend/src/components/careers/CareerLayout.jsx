import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronRight, Eye, Loader2 } from 'lucide-react';
import { careersApi } from '@/lib/careersApi';

const LINKS = [
  { to: '/karriere/stellen', label: 'Stellenangebote' },
  { to: '/karriere/berufseinsteiger', label: 'Berufseinsteiger' },
  { to: '/karriere/quereinsteiger', label: 'Quereinsteiger' },
  { to: '/karriere/berufserfahrene', label: 'Berufserfahrene' },
  { to: '/karriere/ueber-uns', label: 'Über uns' },
  { to: '/karriere/bewerben?initiativ=1', label: 'Initiativbewerbung' },
  { to: '/karriere/datenschutz', label: 'Datenschutz für Bewerber' },
];

const CRUMBS = {
  stellen: 'Stellenangebote', berufseinsteiger: 'Berufseinsteiger', quereinsteiger: 'Quereinsteiger',
  berufserfahrene: 'Berufserfahrene', 'ueber-uns': 'Über uns', bewerben: 'Bewerbung', datenschutz: 'Datenschutz',
};

const Breadcrumb = ({ pathname }) => {
  const parts = pathname.split('/').filter(Boolean).slice(1);
  const items = [{ to: '/', label: 'Startseite' }, { to: '/karriere', label: 'Karriere' }];
  if (parts[0]) items.push({ to: `/karriere/${parts[0]}`, label: CRUMBS[parts[0]] || parts[0] });
  if (parts[0] === 'stellen' && parts[1]) items.push({ to: pathname, label: 'Stellenanzeige' });
  return (
    <nav aria-label="Brotkrumen" className="border-b border-black/5 bg-white" data-testid="career-breadcrumb">
      <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-1 px-5 py-3 text-[13px] text-[#686A64] lg:px-8">
        {items.map((it, i) => (
          <li key={it.to + i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={13} />}
            {i === items.length - 1 ? <span className="font-medium text-[#1E222C]">{it.label}</span>
              : <Link to={it.to} className="hover:text-[#36A852]" data-testid={`career-crumb-${i}`}>{it.label}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
};

const CareerLinks = () => (
  <section className="border-t border-black/5 bg-white" data-testid="career-links">
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#36A852]">Karriere bei der Fröhlich Vermögensberatung GmbH</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="rounded-full border border-black/10 px-4 py-2 text-sm text-[#1E222C] transition-colors hover:border-[#36A852] hover:text-[#36A852]"
            data-testid={`career-link-${l.label.toLowerCase().replace(/[^a-z]/g, '')}`}>{l.label}</Link>
        ))}
      </div>
      <p className="mt-6 text-xs text-[#686A64]">www.essenceinvest.com ist der Internetauftritt der Fröhlich Vermögensberatung GmbH.</p>
    </div>
  </section>
);

const Closed = () => (
  <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center" data-testid="career-closed">
    <h1 className="font-display text-4xl text-[#1E222C]">Unser Karriereportal ist in Vorbereitung.</h1>
    <Link to="/" className="mt-8 rounded-full border border-[#1E222C]/15 px-6 py-3 text-sm font-semibold">Zur Startseite</Link>
  </div>
);

export default function CareerLayout() {
  const [status, setStatus] = useState(null);
  const { pathname, search } = useLocation();

  useEffect(() => {
    careersApi.get('/status').then((r) => setStatus(r.data)).catch(() => setStatus({ site_public: false, applications_enabled: false, is_staff: false }));
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname, search]);

  const visible = status && (status.site_public || status.is_staff);
  return (
    <div className="bg-[#F7F5F0] font-sans text-[#1E222C]" data-testid="career-layout">
      {status && !status.site_public && <Helmet><meta name="robots" content="noindex,nofollow" /></Helmet>}
      {status?.is_staff && !status.site_public && (
        <div className="bg-amber-100 px-4 py-2 text-center text-[13px] text-amber-900" data-testid="career-preview-banner">
          <Eye size={14} className="mr-1.5 inline" /> Vorschau – die Karriereseite ist noch nicht öffentlich.
        </div>
      )}
      <Breadcrumb pathname={pathname} />
      {!status && <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-[#36A852]" /></div>}
      {status && !visible && <Closed />}
      {visible && <Outlet context={{ status }} />}
      {visible && <CareerLinks />}
    </div>
  );
}
