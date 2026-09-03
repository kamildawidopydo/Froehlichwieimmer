import axios from 'axios';

/**
 * Session 81.00 — Homepage Bundle-Deduplication.
 *
 * Ein einziger `/api/stocks/bundle`-Aufruf pro Homepage-Load, gecacht als
 * Promise auf Modul-Ebene. `DeutschlandFokus` und `DividendenBlick` teilen
 * sich diese Antwort und filtern client-seitig — ersetzt die bisher zwei
 * separaten Bundle-Requests aus Phase 3.
 */

const API_BASE = process.env.REACT_APP_BACKEND_URL;

// Vereinigte Symbol-Menge aller Homepage-Aktien-Module.
export const HOMEPAGE_BUNDLE_SYMBOLS = [
  'SAP', 'SIE', 'ALV', 'DBK', 'IFX', 'RHM',
  'NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN',
];

let _bundlePromise = null;

export const fetchHomepageStockBundle = () => {
  if (_bundlePromise) return _bundlePromise;
  _bundlePromise = axios
    .get(`${API_BASE}/api/stocks/bundle`, {
      params: {
        symbols: HOMEPAGE_BUNDLE_SYMBOLS.join(','),
        include_dividends: true,
      },
    })
    .then((r) => r.data)
    .catch((err) => {
      // Bei Fehler Cache invalidieren, damit späterer Retry nicht auf Reject sitzt.
      _bundlePromise = null;
      throw err;
    });
  return _bundlePromise;
};
