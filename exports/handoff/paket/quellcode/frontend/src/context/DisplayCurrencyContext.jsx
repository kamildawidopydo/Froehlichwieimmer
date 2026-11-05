import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Global user-facing display currency (EUR | USD) with localStorage persistence.
 * Backend does all conversion — the FE only sends a `?display_currency=` param
 * to market endpoints. Default is EUR.
 */
const STORAGE_KEY = 'display_currency_v1';
const ALLOWED = new Set(['EUR', 'USD']);

const DisplayCurrencyContext = createContext({
  currency: 'EUR',
  setCurrency: () => {},
  toggle: () => {},
});

const readInitial = () => {
  if (typeof window === 'undefined') return 'EUR';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return ALLOWED.has(raw) ? raw : 'EUR';
  } catch {
    return 'EUR';
  }
};

export const DisplayCurrencyProvider = ({ children }) => {
  const [currency, setCurrencyState] = useState(readInitial);

  const setCurrency = useCallback((next) => {
    const value = ALLOWED.has(next) ? next : 'EUR';
    setCurrencyState(value);
    try { window.localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore quota */ }
  }, []);

  const toggle = useCallback(() => {
    setCurrency(currency === 'EUR' ? 'USD' : 'EUR');
  }, [currency, setCurrency]);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && ALLOWED.has(e.newValue) && e.newValue !== currency) {
        setCurrencyState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [currency]);

  const value = useMemo(() => ({ currency, setCurrency, toggle }), [currency, setCurrency, toggle]);
  return (
    <DisplayCurrencyContext.Provider value={value}>{children}</DisplayCurrencyContext.Provider>
  );
};

export const useDisplayCurrency = () => useContext(DisplayCurrencyContext);
