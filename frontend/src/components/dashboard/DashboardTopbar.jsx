import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, Search, LogOut, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/context/AuthContext';
import CommandPalette from '@/components/CommandPalette';
import KeyboardShortcutsDialog from '@/components/dashboard/KeyboardShortcutsDialog';
import NotificationCenter from '@/components/NotificationCenter';
import ThemeToggle from '@/components/ThemeToggle';

/** IBKR-style top bar — compact, functional, minimal chrome. */
const DashboardTopbar = ({ profilePath = '/dashboard/profil', onOpenMobileNav, showMenuButton = false, showcase = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

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

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  const firstInitial = user?.first_name?.trim()?.[0];
  const lastInitial = user?.last_name?.trim()?.replace(/[^A-Za-zÀ-ÿ]/g, '')?.[0];
  const initials =
    firstInitial && lastInitial
      ? `${firstInitial}${lastInitial}`.toUpperCase()
      : (fullName || user?.email || 'U').slice(0, 2).toUpperCase();

  const searchShortcutLabel = useMemo(() => {
    if (typeof navigator === 'undefined') return '⌘K';
    const isApple = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isApple ? '⌘K' : 'Ctrl+K';
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 flex h-[52px] items-center gap-2 border-b border-bank-border bg-white px-3 dark:bg-bank-surface sm:gap-3 sm:px-5">
      {showMenuButton && (
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-bank-border text-bank-text-muted transition-colors hover:bg-bank-bg hover:text-bank-text lg:hidden"
          aria-label="Menü öffnen"
        >
          <Menu size={17} strokeWidth={1.5} />
        </button>
      )}

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex h-8 flex-1 max-w-md items-center gap-2 rounded-md border border-bank-border bg-bank-bg/50 px-3 text-[13px] text-bank-text-muted transition-colors hover:border-bank-primary/25 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/20 dark:hover:bg-bank-surface-elev"
      >
        <Search size={14} strokeWidth={1.5} className="shrink-0" />
        <span className="flex-1 truncate text-left">Suchen…</span>
        <kbd className="hidden shrink-0 rounded border border-bank-border bg-white px-1.5 py-0.5 font-mono text-[9px] text-bank-text-muted sm:inline">
          {searchShortcutLabel}
        </kbd>
      </button>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Button
          asChild
          size="sm"
          className="hidden h-8 gap-1.5 px-3 text-[12px] font-semibold sm:inline-flex"
        >
          <Link to="/dashboard/handeln">
            <TrendingUp size={14} strokeWidth={2} />
            Handeln
          </Link>
        </Button>
        <Button asChild size="sm" variant="default" className="h-8 px-2.5 sm:hidden">
          <Link to="/dashboard/handeln" aria-label="Handeln">
            <TrendingUp size={16} strokeWidth={2} />
          </Link>
        </Button>
        {!showcase && <ThemeToggle compact tone="light" />}
        <NotificationCenter />

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-2 rounded-md border border-bank-border bg-white py-0 pl-0.5 pr-2 transition-colors hover:bg-bank-bg/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/20 dark:bg-bank-surface"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.avatar_url || ''} alt="" />
                <AvatarFallback className="bg-bank-primary/10 text-[10px] font-semibold text-bank-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[120px] truncate text-[12px] font-medium text-bank-text md:inline">
                {fullName || user?.email}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={6} className="w-64 rounded-lg border border-bank-border p-0 shadow-lg">
            <div className="border-b border-bank-border px-4 py-3">
              <p className="truncate text-[13px] font-semibold text-bank-text">{fullName || 'Konto'}</p>
              <p className="truncate text-[11px] text-bank-text-muted">{user?.email}</p>
            </div>
            <nav className="flex flex-col py-1">
              <PopoverLink to={profilePath}>Profil & Einstellungen</PopoverLink>
              <PopoverLink to="/dashboard/kontoauszug">Kontoauszug</PopoverLink>
              {user?.role === 'admin' && <PopoverLink to="/admin">Administration</PopoverLink>}
            </nav>
            <div className="border-t border-bank-border p-1">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-[13px] text-bank-error transition-colors hover:bg-bank-error/8"
              >
                <LogOut size={14} strokeWidth={1.5} />
                Abmelden
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </header>
  );
};

const PopoverLink = ({ to, children }) => (
  <Link
    to={to}
    className="px-3 py-2 text-[13px] font-medium text-bank-text transition-colors hover:bg-bank-bg/60 hover:text-bank-primary"
  >
    {children}
  </Link>
);

export default DashboardTopbar;
