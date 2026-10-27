import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Menu, X, Eye, Loader2 } from 'lucide-react';
import { careersApi } from '@/lib/careersApi';

const NAV = [
  { to: '/karriere', label: 'Karriere', end: true },
  { to: '/karriere/stellen', label: 'Stellenangebote' },
  { to: '/karriere/berufseinsteiger', label: 'Berufseinsteiger' },
  { to: '/karriere/quereinsteiger', label: 'Quereinsteiger' },
  { to: '/karriere/berufserfahrene', label: 'Berufserfahrene' },
  { to: '/karriere/ueber-uns', label: 'Über uns' },
  { to: '/karriere/bewerben?initiativ=1', label: 'Initiativbewerbung' },
];

const navCls = ({ isActive }) =>
  `whitespace-nowrap px-2.5 py-2 text-[13.5px] font-medium transition-colors ${isActive ? 'text-[#36A852]' : 'text-[#1E222C]/80 hover:text-[#36A852]'}`;

const Header = ({ open, setOpen, search }) => (
  <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-lg">
    <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
      <Link to="/karriere" className="flex items-center gap-3" data-testid="career-logo-link">
        <span className="font-display text-[22px] font-medium tracking-tight text-[#1E222C]">Essence<span className="text-[#36A852]"> Invest</span></span>
        <span className="hidden border-l border-black/10 pl-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#36A852] sm:inline">Karriere</span>
      </Link>
      <nav className="hidden items-center xl:flex" aria-label="Karriere-Navigation">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={(s) => navCls({ isActive: s.isActive && (n.to.includes('initiativ') ? search.includes('initiativ') : !search.includes('initiativ')) })} data-testid={`career-nav-${n.label.toLowerCase().replace(/[^a-z]/g, '')}`}>{n.label}</NavLink>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <Link to="/karriere/bewerben" data-testid="career-header-apply-btn"
          className="rounded-full bg-[#36A852] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-[#2E9446]">
          Jetzt bewerben
        </Link>
        <button type="button" className="rounded-full p-2 xl:hidden" onClick={() => setOpen(!open)} aria-label="Menü" data-testid="career-mobile-menu-btn">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </div>
    {open && (
      <nav className="border-t border-black/5 bg-white px-5 py-3 xl:hidden" data-testid="career-mobile-nav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `block rounded-lg px-3 py-3 text-[15px] font-medium ${isActive ? 'bg-[#36A852]/10 text-[#36A852]' : 'text-[#1E222C]'}`}>{n.label}</NavLink>
        ))}
      </nav>
    )}
  </header>
);

const Footer = () => (
  <footer className="bg-[#1E222C] text-white/70">
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-4 lg:px-8">
      <div className="lg:col-span-2">
        <p className="font-display text-2xl text-white">Essence Invest · Karriere</p>
        <p className="mt-3 max-w-md text-sm leading-relaxed">Essence Invest ist eine Marke der Fröhlich Vermögensberatung GmbH.</p>
      </div>
      <div className="text-sm leading-7">
        <p className="mb-2 font-semibold text-white">Karriere</p>
        <Link className="block hover:text-white" to="/karriere/stellen">Stellenangebote</Link>
        <Link className="block hover:text-white" to="/karriere/bewerben?initiativ=1">Initiativbewerbung</Link>
        <Link className="block hover:text-white" to="/karriere/ueber-uns">Über uns</Link>
      </div>
      <div className="text-sm leading-7">
        <p className="mb-2 font-semibold text-white">Rechtliches</p>
        <Link className="block hover:text-white" to="/karriere/datenschutz" data-testid="career-footer-privacy">Datenschutz für Bewerber</Link>
        <Link className="block hover:text-white" to="/legal/impressum">Impressum</Link>
        <Link className="block hover:text-white" to="/">Zur Hauptseite</Link>
      </div>
    </div>
    <div className="border-t border-white/10 px-5 py-5 text-center text-xs">Fröhlich Vermögensberatung GmbH · Bösgrunder Weg 62 · 55543 Bad Kreuznach · HRB 23436</div>
  </footer>
);

const Closed = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center" data-testid="career-closed">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#36A852]">Karriere bei Essence Invest</p>
    <h1 className="mt-4 font-display text-4xl text-[#1E222C] sm:text-5xl">Unser Karriereportal ist in Vorbereitung.</h1>
    <p className="mt-4 max-w-lg text-[#555]">Schon bald findest du hier alle Stellenangebote. Schau gerne wieder vorbei.</p>
    <Link to="/" className="mt-8 rounded-full border border-[#1E222C]/15 px-6 py-3 text-sm font-semibold">Zur Startseite</Link>
  </div>
);

export default function CareerLayout() {
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(false);
  const { pathname, search } = useLocation();

  useEffect(() => {
    careersApi.get('/status').then((r) => setStatus(r.data)).catch(() => setStatus({ site_public: false, applications_enabled: false, is_staff: false }));
  }, []);
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname, search]);

  const visible = status && (status.site_public || status.is_staff);
  return (
    <div className="min-h-screen bg-[#F7F5F0] font-sans text-[#1E222C]">
      {status && !status.site_public && <Helmet><meta name="robots" content="noindex,nofollow" /></Helmet>}
      {status?.is_staff && !status.site_public && (
        <div className="bg-amber-100 px-4 py-2 text-center text-[13px] text-amber-900" data-testid="career-preview-banner">
          <Eye size={14} className="mr-1.5 inline" /> Vorschau – die Karriereseite ist noch nicht öffentlich. Entwürfe sind nur für Sie sichtbar.{' '}
          <Link to="/recruiting" className="font-semibold underline">Zum Recruiting-Dashboard</Link>
        </div>
      )}
      <Header open={open} setOpen={setOpen} search={search} />
      <main>
        {!status && <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-[#36A852]" /></div>}
        {status && !visible && <Closed />}
        {visible && <Outlet context={{ status }} />}
      </main>
      <Footer />
    </div>
  );
}
