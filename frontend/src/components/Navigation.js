import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, FileText, ChevronDown, Search, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import CommandPalette from '@/components/CommandPalette';
import NotificationCenter from '@/components/NotificationCenter';
import StockNotificationBell from '@/components/StockNotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
import BrandLogo from '@/components/BrandLogo';
import siteCopy from '@/data/siteCopy';
import { CustomerServiceTopBar } from '@/components/NavCustomerServiceContact';

const { nav: navCopy } = siteCopy;
const navGroups = navCopy.groups;
const newsLink = navCopy.news;
const navActions = navCopy.actions;

/**
 * Navigation — Light chrome sitewide (white bar, dark text).
 */
const Navigation = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef(null);

  // Height is stable now (no compact shrink) — measure once + on resize only.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return undefined;

    let raf = 0;
    let lastH = -1;

    const applyHeight = (height) => {
      const rounded = Math.round(height);
      if (rounded === lastH) return;
      lastH = rounded;
      document.documentElement.style.setProperty('--site-nav-h', `${rounded}px`);
    };

    const scheduleSync = (height) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => applyHeight(height));
    };

    scheduleSync(header.offsetHeight);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const box = entry?.borderBoxSize?.[0];
      const height = box?.blockSize ?? entry?.contentRect?.height ?? header.offsetHeight;
      scheduleSync(height);
    });
    observer.observe(header);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const readY = () => window.scrollY || document.documentElement.scrollTop || 0;
    const onScroll = () => setScrolled(readY() > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === 'Escape' && paletteOpen) setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [paletteOpen]);

  useEffect(() => {
    setMobileOpen(false);
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    setScrolled(y > 12);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const isActive = (path) => location.pathname === path;
  const isNavLinkActive = (link) => {
    if (link.path === '/news') {
      return location.pathname === '/news' || location.pathname.startsWith('/news/');
    }
    return isActive(link.path);
  };
  const hideAuthenticatedNavWidgets = location.pathname === '/login';
  const userHomePath =
    user?.role === 'admin'
      ? '/admin'
      : user?.onboarding_completed
        ? '/dashboard'
        : '/onboarding';
  const userHomeLabel =
    user?.role === 'admin' || user?.onboarding_completed ? navActions.dashboard : navActions.onboarding;

  const linkMuted = 'text-bank-text-muted hover:text-bank-text';
  const linkActive = 'text-bank-text';
  const chipBtn =
    'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-bank-border px-2.5 py-2 text-[11px] font-medium text-bank-text-muted transition-colors duration-200 hover:border-bank-primary/35 hover:text-bank-primary xl:px-3';
  const formularBtn =
    'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-bank-signature px-2.5 py-2 text-[11px] font-semibold text-white transition-colors duration-200 hover:bg-bank-signature-hover xl:px-3';

  return (
    <header
      ref={headerRef}
      data-site-nav
      className="sticky top-0 z-[100] overflow-visible"
    >
      <CustomerServiceTopBar />
      <nav
        role="navigation"
        aria-label="Hauptnavigation"
        className={cn(
          'relative overflow-visible border-b border-bank-border bg-bank-bg transition-[background-color,border-color,box-shadow] duration-500 ease-out',
          scrolled && 'shadow-[0_8px_24px_-18px_rgba(30,41,59,0.18)]',
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-bank-primary/25 to-transparent opacity-80"
        />

        <div className="mx-auto flex min-h-[5rem] w-full max-w-[1600px] items-center gap-3 overflow-visible px-5 sm:min-h-[5.25rem] lg:gap-5 lg:px-12 xl:px-16">
          <Link
            to="/"
            data-testid="nav-logo"
            className="relative z-40 flex shrink-0 items-center overflow-visible py-1.5 transition-opacity duration-200 hover:opacity-90"
          >
            <BrandLogo
              imgClassName="h-[42px] w-auto max-w-[min(75vw,18rem)] object-contain object-left sm:h-[46px] sm:max-w-[20rem] md:h-[50px] md:max-w-[22rem] lg:h-[58px] lg:max-w-[26rem] xl:h-[60px] xl:max-w-[28rem]"
            />
          </Link>

          {/* Desktop — compact dropdown navigation */}
          <div
            className="relative z-30 hidden min-w-0 flex-1 justify-center overflow-visible lg:flex"
            role="menubar"
          >
            <div className="flex items-center gap-x-1 overflow-visible xl:gap-x-2">
              {navGroups.map((group) => {
                const hasActiveChild = group.links.some((l) => isNavLinkActive(l));
                return (
                  <div
                    key={group.id}
                    className="group/nav relative shrink-0"
                    role="group"
                    aria-label={group.label}
                  >
                    <button
                      type="button"
                      className={cn(
                        'flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-medium tracking-normal transition-colors duration-200',
                        hasActiveChild ? linkActive : linkMuted,
                      )}
                    >
                      {group.label}
                      <ChevronDown
                        className="h-3.5 w-3.5 opacity-50 transition-transform duration-200 group-hover/nav:rotate-180"
                        strokeWidth={1.5}
                      />
                    </button>
                    <div className="pointer-events-none absolute left-0 top-full z-[120] pt-2 opacity-0 transition-all duration-200 ease-out group-hover/nav:pointer-events-auto group-hover/nav:opacity-100 xl:left-1/2 xl:-translate-x-1/2">
                      <div className="min-w-[260px] max-w-[320px] overflow-hidden rounded-lg border border-bank-border bg-bank-surface shadow-editorial-lg">
                        <ul className="py-1.5">
                          {group.links.map((link) => {
                            const active = isNavLinkActive(link);
                            return (
                              <li key={link.path}>
                                <Link
                                  to={link.path}
                                  data-testid={`nav-${link.name.toLowerCase().replace(/\s/g, '-')}`}
                                  className={cn(
                                    'group/item flex flex-col gap-0.5 px-4 py-2.5 transition-colors duration-150 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-bank-gold',
                                    active ? 'bg-bank-bg' : 'hover:bg-bank-bg',
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'text-[14px] font-medium leading-tight',
                                      link.accent || active
                                        ? 'text-bank-gold'
                                        : 'text-bank-text group-hover/item:text-bank-primary',
                                    )}
                                  >
                                    {link.name}
                                  </span>
                                  {link.desc && (
                                    <span className="text-[12px] leading-snug text-bank-text-muted">
                                      {link.desc}
                                    </span>
                                  )}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
              <Link
                to={newsLink.path}
                data-testid="nav-news"
                className={cn(
                  'shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-200',
                  isNavLinkActive(newsLink) ? linkActive : linkMuted,
                )}
              >
                {newsLink.name}
              </Link>
            </div>
          </div>

          <div className="relative z-40 flex shrink-0 items-center gap-1 sm:gap-1.5 lg:gap-2">
            <div className="hidden items-center gap-1 lg:flex xl:gap-1.5">
              <Link
                to="/formular"
                data-testid="nav-formular-btn"
                title={navActions.formular}
                aria-label={navActions.formular}
                className={formularBtn}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                <span className="hidden min-[1400px]:inline">{navActions.formular}</span>
              </Link>
              <Link
                to="/dokument-upload"
                data-testid="nav-dokument-upload-btn"
                title={navActions.upload}
                aria-label={navActions.upload}
                className={chipBtn}
              >
                <Upload className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                <span className="hidden xl:inline min-[1400px]:hidden">{navActions.uploadShort}</span>
                <span className="hidden min-[1400px]:inline">{navActions.upload}</span>
              </Link>
              {user ? (
                <>
                  {/* Session 81.04 — CTA "Mein Depot" für eingeloggte Kunden.
                      Nur wenn Onboarding abgeschlossen (Admin muss Depot nicht sehen). */}
                  {user.role !== 'admin' && user.onboarding_completed && (
                    <Link
                      to="/mein-depot"
                      data-testid="nav-mein-depot-btn"
                      className={cn('shrink-0 rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-200', linkMuted)}
                    >
                      Mein Depot
                    </Link>
                  )}
                  <Link
                    to={userHomePath}
                    data-testid="nav-dashboard-btn"
                    className={cn('shrink-0 rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-200', linkMuted)}
                  >
                    {userHomeLabel}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    data-testid="nav-logout-btn"
                    className={cn('shrink-0 cursor-pointer rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-200', linkMuted)}
                  >
                    {navActions.logout}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    data-testid="nav-login-btn"
                    className={cn('shrink-0 rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-200', linkMuted)}
                  >
                    {navActions.login}
                  </Link>
                  <Link
                    to="/register"
                    data-testid="nav-register-btn"
                    className="inline-flex shrink-0 cursor-pointer items-center rounded-md bg-[rgb(var(--bank-accent))] px-4 py-2 text-[13px] font-semibold text-white transition-colors duration-200 hover:bg-[rgb(var(--bank-accent-strong))]"
                  >
                    <span className="min-[1400px]:hidden">{navActions.registerShort}</span>
                    <span className="hidden min-[1400px]:inline">{navActions.register}</span>
                  </Link>
                </>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                aria-label="Suche öffnen (Ctrl+K)"
                title="Suche (Ctrl+K)"
                className="hidden h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-bank-border text-bank-text-muted transition-colors duration-200 hover:border-bank-primary/35 hover:text-bank-primary lg:inline-flex xl:h-auto xl:w-auto xl:gap-2 xl:px-3 xl:py-2"
              >
                <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                <span className="hidden min-[1400px]:inline text-[13px]">{navActions.search}</span>
                <kbd className="ml-0.5 hidden items-center gap-0.5 border border-bank-border bg-bank-surface-elev px-1.5 py-0.5 font-mono text-[10px] text-bank-text-muted min-[1400px]:inline-flex">
                  <span className="text-[9px]">⌘</span>K
                </kbd>
              </button>
              <div className="hidden shrink-0 lg:inline-flex">
                <ThemeToggle compact tone="light" />
              </div>
              {user && !hideAuthenticatedNavWidgets && <NotificationCenter chrome="light" />}
              {user && !hideAuthenticatedNavWidgets && <StockNotificationBell chrome="light" />}
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="flex h-11 w-11 items-center justify-center text-bank-text-muted transition-colors hover:text-bank-text lg:hidden"
                aria-label="Suche öffnen"
              >
                <Search className="h-[20px] w-[20px]" strokeWidth={1.32} />
              </button>
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex h-11 w-11 items-center justify-center text-bank-text transition-colors hover:text-bank-primary lg:hidden"
                data-testid="mobile-menu-toggle"
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav-drawer"
                aria-label="Menü öffnen"
              >
                <Menu className="h-[22px] w-[22px]" strokeWidth={1.32} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[120] bg-bank-ink/50 backdrop-blur-[2px] lg:hidden"
              aria-label="Menü schließen"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              id="mobile-nav-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 right-0 z-[130] flex w-full max-w-[min(100%,22rem)] flex-col border-l border-bank-border bg-bank-surface shadow-editorial-lg lg:hidden dark:bg-bank-surface"
            >
              <div className="flex items-center justify-between border-b border-bank-border px-6 py-4">
                <span className="text-lg font-semibold text-bank-text">{navActions.menu}</span>
                <div className="flex items-center gap-2">
                  <ThemeToggle compact tone="light" />
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center text-bank-text-muted transition-colors hover:text-bank-text"
                    aria-label="Menü schließen"
                  >
                    <X className="h-5 w-5" strokeWidth={1.32} />
                  </button>
                </div>
              </div>

              <div
                className="flex-1 overflow-y-auto px-6 py-8"
                data-testid="mobile-menu"
              >
                {navGroups.map((group) => (
                  <div key={group.id} className="mb-10 last:mb-0">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-bank-text-muted">
                      {group.label}
                    </p>
                    <ul className="space-y-0 divide-y divide-bank-border border-t border-bank-border">
                      {group.links.map((link) => {
                        const active = isNavLinkActive(link);
                        return (
                          <li key={link.path}>
                            <Link
                              to={link.path}
                              data-testid={`nav-${link.name.toLowerCase().replace(/\s/g, '-')}`}
                              className={cn(
                                'flex flex-col gap-0.5 py-3.5 transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold',
                                link.accent || active
                                  ? 'text-bank-gold'
                                  : 'text-bank-text hover:text-bank-primary',
                              )}
                            >
                              <span className="text-[15px] font-medium leading-tight">{link.name}</span>
                              {link.desc && (
                                <span className="text-[12px] text-bank-text-muted">{link.desc}</span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}

                <div className="mb-10">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-bank-text-muted">
                    {newsLink.name}
                  </p>
                  <ul className="divide-y divide-bank-border border-t border-bank-border">
                    <li>
                      <Link
                        to={newsLink.path}
                        data-testid="nav-news"
                        className={cn(
                          'flex flex-col gap-0.5 py-3.5 transition-colors',
                          isNavLinkActive(newsLink)
                            ? 'text-bank-gold'
                            : 'text-bank-text hover:text-bank-primary',
                        )}
                      >
                        <span className="text-[15px] font-medium leading-tight">{newsLink.name}</span>
                        <span className="text-[12px] text-bank-text-muted">{newsLink.desc}</span>
                      </Link>
                    </li>
                  </ul>
                </div>

                <div className="mt-4 border-t border-bank-border pt-8">
                  <Link
                    to="/formular"
                    className="mb-3 flex cursor-pointer items-center justify-center gap-2 rounded-md bg-bank-signature py-3 text-[13px] font-semibold text-white transition-colors hover:bg-bank-signature-hover"
                  >
                    <FileText className="h-4 w-4" strokeWidth={1.5} />
                    {navActions.formular}
                  </Link>
                  <Link
                    to="/dokument-upload"
                    data-testid="nav-dokument-upload-btn-mobile"
                    className="mb-3 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-bank-border py-3 text-[13px] font-medium text-bank-text transition-colors hover:border-bank-primary/30 hover:text-bank-primary"
                  >
                    <Upload className="h-4 w-4" strokeWidth={1.5} />
                    {navActions.upload}
                  </Link>
                  {user ? (
                    <div className="flex flex-col gap-2">
                      <Link
                        to={userHomePath}
                        className="rounded-md border border-bank-border py-3 text-center text-[13px] font-medium text-bank-text transition-colors hover:border-bank-primary/30"
                      >
                        {userHomeLabel}
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="cursor-pointer py-3 text-center text-[13px] text-bank-text-muted transition-colors hover:text-bank-text"
                      >
                        {navActions.logout}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Link
                        to="/register"
                        data-testid="nav-register-btn"
                        className="rounded-md bg-bank-primary py-3 text-center text-[13px] font-semibold text-white transition-colors hover:bg-bank-primary-hover"
                      >
                        {navActions.register}
                      </Link>
                      <Link
                        to="/login"
                        data-testid="nav-login-btn"
                        className="py-3 text-center text-[14px] font-medium text-bank-text-muted transition-colors hover:text-bank-text"
                      >
                        {navActions.login}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
};

export default Navigation;
