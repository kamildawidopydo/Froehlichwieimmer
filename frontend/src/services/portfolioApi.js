/**
 * portfolioApi — shared Mongo-native Portfolio-Reads via httpOnly-Cookie-Auth.
 *
 * Session 82.17 · Depot Phase 1: eingeführt inline in `DashboardDataContext`.
 * Session 82.25: extrahiert, damit auch andere Komponenten (z. B.
 * PortfolioHistoryChart) denselben Fetch nutzen.
 */

export async function fetchPortfolioJson(path) {
  const resp = await fetch(path, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!resp.ok) {
    const err = new Error(`HTTP ${resp.status}`);
    err.status = resp.status;
    throw err;
  }
  return resp.json();
}
