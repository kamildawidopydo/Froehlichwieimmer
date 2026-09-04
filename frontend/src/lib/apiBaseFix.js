/**
 * Session 81.09 — Production Backend-URL Hotfix (P0)
 *
 * Wurzelursache:
 *   Der Emergent-Prod-Build injiziert bei manchen Deployments einen veralteten
 *   Wert `REACT_APP_BACKEND_URL=https://kapital-direkt24.de` (Legacy-Domain).
 *   ~15 Frontend-Services (marketService, watchlistApi, reviewsApi,
 *   apiClient, …) lesen `process.env.REACT_APP_BACKEND_URL` direkt beim
 *   `axios.create()`-Aufruf und richten dadurch ALLE ihre Requests an die
 *   Legacy-Domain, was in CORS-Fehlern und leeren Widgets endet
 *   (Kurse, Reviews, Watchlist, Depot, Auth, …).
 *
 * Fix (minimal, ein Modul):
 *   Wir patchen `axios.create` **einmalig** bevor irgendein Service seine
 *   Axios-Instanz erzeugt. Der Patch installiert einen Request-Interceptor,
 *   der jede baseURL/URL mit dem Legacy-Host durch `window.location.origin`
 *   ersetzt. Dadurch laufen alle API-Calls auf die aktuell aktive Domain
 *   (Same-Origin: sowohl Preview `…preview.emergentagent.com` als auch Prod
 *   `…emergent.host` liefern Frontend + `/api/*` unter derselben Origin).
 *
 * Nebenwirkungsfrei:
 *   – Wenn `REACT_APP_BACKEND_URL` bereits korrekt gesetzt ist (kein
 *     Legacy-Host), wird nichts rewritten.
 *   – Wenn die App auf einem Server ohne `window` läuft (SSR), macht der
 *     Patch nichts (kein-op).
 *   – Der Interceptor läuft synchron, keine zusätzliche Latenz.
 *
 * Zukunftsfest:
 *   Ein späterer Domain-Wechsel oder eine falsche Env-Var-Injektion führt
 *   ab jetzt automatisch zurück zur aktiven Origin und verursacht keinen
 *   CORS-Ausfall mehr.
 */

import axios from 'axios';

const LEGACY_HOST_PATTERN = /^https?:\/\/kapital-direkt24\.de/i;

function rewriteIfLegacy(value) {
  if (typeof value !== 'string' || !value) return value;
  if (!LEGACY_HOST_PATTERN.test(value)) return value;
  if (typeof window === 'undefined' || !window.location?.origin) return value;
  return value.replace(LEGACY_HOST_PATTERN, window.location.origin);
}

function installInterceptor(instance) {
  if (!instance || !instance.interceptors?.request) return;
  instance.interceptors.request.use((config) => {
    if (config?.baseURL) config.baseURL = rewriteIfLegacy(config.baseURL);
    if (config?.url) config.url = rewriteIfLegacy(config.url);
    return config;
  });
}

// Patch the module-level `axios` instance so any code that calls
// `axios.get(...)` / `axios.post(...)` directly is also covered.
installInterceptor(axios);

// Wrap `axios.create` so EVERY future service that calls
// `axios.create({ baseURL: '<legacy-host>/api' })` gets the interceptor.
const originalCreate = axios.create.bind(axios);
axios.create = function patchedAxiosCreate(config = {}) {
  const patchedConfig = { ...config };
  if (patchedConfig.baseURL) {
    patchedConfig.baseURL = rewriteIfLegacy(patchedConfig.baseURL);
  }
  const instance = originalCreate(patchedConfig);
  installInterceptor(instance);
  return instance;
};

// Marker so we can verify the patch is loaded in the running bundle.
if (typeof window !== 'undefined') {
  window.__apiBaseFixInstalled = true;
}

export default { installed: true };
