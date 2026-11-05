import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'dashboard_recent_pages_v1';
const MAX = 6;

const ROUTE_LABELS = {
  '/dashboard/uebersicht': 'Übersicht',
  '/dashboard/vermoegen': 'Mein Vermögen',
  '/dashboard/depot': 'Mein Vermögen',
  '/dashboard/festgeld': 'Festgeld',
  '/dashboard/tagesgeld': 'Tagesgeld',
  '/dashboard/flexgeld': 'Flexgeld',
  '/dashboard/anleihen': 'Anleihen',
  '/dashboard/anleihen/kaufen': 'Anleihe kaufen',
  '/dashboard/aktien': 'Aktien',
  '/dashboard/ipo': 'IPO',
  '/dashboard/handeln': 'Markt',
  '/dashboard/auftraege': 'Aufträge',
  '/dashboard/alarme': 'Kursalarme',
  '/dashboard/favoriten': 'Favoriten',
  '/dashboard/news': 'Nachrichten',
  '/dashboard/kontoauszug': 'Kontoauszug',
  '/dashboard/dokumente': 'Dokumente',
  '/dashboard/profil': 'Profil',
  '/dashboard/support': 'Support',
};

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStorage(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

/** Track and return recently visited dashboard routes for command palette. */
export function useRecentPages() {
  const location = useLocation();
  const [recent, setRecent] = useState(readStorage);

  const record = useCallback((path, label) => {
    if (!path?.startsWith('/dashboard')) return;
    setRecent((prev) => {
      const next = [
        { path, label: label || ROUTE_LABELS[path] || path, at: Date.now() },
        ...prev.filter((r) => r.path !== path),
      ].slice(0, MAX);
      writeStorage(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '') || '/';
    if (!path.startsWith('/dashboard')) return;
    const label = ROUTE_LABELS[path];
    if (label) record(path, label);
  }, [location.pathname, record]);

  return { recent, record };
}

export default useRecentPages;
