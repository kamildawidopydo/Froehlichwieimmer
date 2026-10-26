/**
 * Session 81.10 — Zentrale API-Base-Utility für alle internen App-API-Clients.
 *
 * Hintergrund:
 *   Für diese Emergent-Cloudflare-Farm-Vorlage (fastapi_react_mongo_shadcn)
 *   wird `REACT_APP_BACKEND_URL` zur Build-Zeit via `sed` durch eine im Farm-
 *   Template registrierte kanonische Prod-URL ersetzt — unabhängig vom User-
 *   Secret. Wenn diese kanonische URL veraltet ist (z. B. `kapital-direkt24.de`
 *   statt der aktuellen Prod-Origin), landen ALLE internen API-Requests dort
 *   und werden per CORS blockiert.
 *
 * Strategie:
 *   Same-Origin bevorzugen. Da unsere App auf Preview UND Prod immer Frontend
 *   + `/api/*` unter derselben Origin ausliefert, ist ein leerer Base-String
 *   die einzig zukunftsfeste, wartungsarme Konfiguration:
 *     axios.create({ baseURL: `${getApiBase()}/api` })
 *   liefert bei Same-Origin `baseURL: '/api'`, was direkt gegen die aktuelle
 *   Origin läuft (Browser hängt automatisch das Protocol + Host an).
 *
 * Nicht anfassen:
 *   – Externe Publisher-URLs (Euronews source_url, Bilder-CDN, Drittanbieter)
 *   – SEO-Canonical-Links, JSON-LD Breadcrumbs, `REACT_APP_SITE_URL`
 *   – Business-Logik, Portfolio, News-Architektur, Auth-Semantik
 */

const LEGACY_HOST_PATTERNS = [
  /kapital-direkt24\.de$/i, // veraltete Canonical-Farm-URL
];

function isLegacyHost(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return LEGACY_HOST_PATTERNS.some((rx) => rx.test(parsed.host));
  } catch {
    return false;
  }
}

/**
 * Ermittelt die zu verwendende API-Origin.
 *   – Browser-Runtime + Env-Var leer / nicht gesetzt → "" (Same-Origin)
 *   – Browser-Runtime + Env-Var zeigt auf bekannten Legacy-Host → "" (Same-Origin)
 *   – Browser-Runtime + Env-Var ist eine echte URL zu einer anderen Origin → dieser Wert
 *     (z. B. für lokale Dev-Setups, in denen Frontend und Backend auf
 *     verschiedenen Ports laufen; wird von der Same-Origin-Prod-Deployment-
 *     Realität nicht beeinflusst)
 *   – SSR/Node/Tests ohne window → Env-Var-Wert oder ""
 */
export function resolveApiBase() {
  const rawEnv = (process.env.REACT_APP_BACKEND_URL || '').trim().replace(/\/+$/, '');
  if (typeof window === 'undefined') {
    return rawEnv || '';
  }
  if (!rawEnv) return '';
  if (isLegacyHost(rawEnv)) return '';
  // Eigene Domain (z. B. essenceinvest.com): API liegt immer unter derselben Origin.
  try {
    const host = new URL(rawEnv).hostname;
    if (host !== 'localhost' && host !== window.location.hostname) return '';
  } catch {
    return '';
  }
  return rawEnv;
}

/** Kurzform, wird häufig in `axios.create({ baseURL: `${getApiBase()}/api` })` verwendet. */
export function getApiBase() {
  return resolveApiBase();
}

/**
 * Kanonischer Helper zum Bauen einer API-URL. Verhindert doppeltes /api/api,
 * doppelte Slashes und Whitespace.
 *   apiUrl('/api/auth/me')  → '/api/auth/me' (Same-Origin)
 *   apiUrl('auth/me')       → '/api/auth/me'
 */
export function apiUrl(path) {
  const base = resolveApiBase();
  let p = String(path || '').trim();
  if (!p.startsWith('/')) p = `/${p}`;
  if (!p.startsWith('/api/') && p !== '/api') p = `/api${p}`;
  return `${base}${p}`;
}

const apiBase = { resolveApiBase, getApiBase, apiUrl };
export default apiBase;
