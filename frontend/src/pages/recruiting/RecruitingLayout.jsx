import React from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BarChart3, Briefcase, Users, Settings, LogOut, ExternalLink, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import BrandLogo from '@/components/BrandLogo';

const NAV = [
  { to: '/recruiting', label: 'Übersicht', icon: BarChart3, end: true },
  { to: '/recruiting/stellen', label: 'Stellen', icon: Briefcase },
  { to: '/recruiting/bewerbungen', label: 'Bewerbungen', icon: Users },
  { to: '/recruiting/einstellungen', label: 'Einstellungen', icon: Settings },
];

export default function RecruitingLayout() {
  const { user, loading, logout } = useAuth();
  const { pathname, search } = useLocation();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-[#36A852]" /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
  if (user.must_change_password) return <Navigate to="/reset-password?mode=force" replace />;
  if (!['admin', 'recruiting'].includes(user.role)) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-[#F4F3EF] font-sans text-[#1E222C]">
      <Helmet><meta name="robots" content="noindex,nofollow" /><title>Recruiting · Essence Invest</title></Helmet>
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <BrandLogo alt="Essence Invest" imgClassName="h-[36px] w-auto max-w-[50vw] object-contain object-left sm:h-[40px]" />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-[#36A852] sm:inline">Recruiting</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link to="/karriere" target="_blank" className="hidden items-center gap-1 rounded-full border border-black/10 px-3 py-1.5 sm:inline-flex" data-testid="recruiting-preview-link"><ExternalLink size={14} /> Karriereseite</Link>
            {user.role === 'admin' && <Link to="/admin" className="hidden rounded-full border border-black/10 px-3 py-1.5 md:inline-block" data-testid="recruiting-admin-link">Admin</Link>}
            <button type="button" onClick={logout} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 hover:bg-black/5" data-testid="recruiting-logout"><LogOut size={14} /> Abmelden</button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 lg:px-8">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} data-testid={`recruiting-nav-${label.toLowerCase().replace(/[^a-z]/g, '')}`}
              className={({ isActive }) => `inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium ${isActive ? 'border-[#36A852] text-[#1E222C]' : 'border-transparent text-[#686A64] hover:text-[#1E222C]'}`}>
              <Icon size={15} />{label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8"><Outlet context={{ user }} /></main>
    </div>
  );
}
