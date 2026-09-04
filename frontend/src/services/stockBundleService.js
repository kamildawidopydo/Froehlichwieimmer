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
// Session 81.03 — DE-Universe erweitert (nur Titel mit realer yfinance-Coverage):
//   Alt: 6 DE-Bluechips.
//   Neu: 21 DE-Bluechips (DAX-Kern + ausgewählte MDAX). FRE (Fresenius) via Probe
//   ausgeschlossen — Provider liefert aktuell keine Preisdaten.
export const HOMEPAGE_BUNDLE_SYMBOLS = [
  // DE (21)
  'SAP', 'SIE', 'ALV', 'DBK', 'IFX', 'RHM',
  'DTE', 'MUV2', 'BAS', 'MBG', 'BMW', 'VOW3',
  'EOAN', 'RWE', 'HEN3', 'BEI', 'ENR', 'DHL',
  'VNA', 'CBK', 'ADS',
  // US (5)
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
