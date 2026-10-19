import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'dashboard_widget_prefs_v2';

/** Simpler defaults for new users — advanced widgets stay available via settings. */
export const DEFAULT_PREFS = {
  marketOverview: true,
  hotNews: true,
  watchlist: true,
  maturity: false,
  dividends: false,
  earnings: false,
  pendingOrders: true,
  taxSummary: false,
  performanceTeaser: false,
  export: false,
  compactMode: true,
};

export function useWidgetPrefs() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  const persist = useCallback((next) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    return next;
  }, []);

  const toggle = useCallback((key) => {
    setPrefs((prev) => persist({ ...prev, [key]: !prev[key] }));
  }, [persist]);

  const setCompact = useCallback((value) => {
    setPrefs((prev) => persist({ ...prev, compactMode: Boolean(value) }));
  }, [persist]);

  const setPrefsBulk = useCallback((partial) => {
    setPrefs((prev) => persist({ ...prev, ...partial }));
  }, [persist]);

  return { prefs, loaded, toggle, setCompact, setPrefsBulk, DEFAULT_PREFS };
}

export default useWidgetPrefs;
