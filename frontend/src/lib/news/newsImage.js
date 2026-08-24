/**
 * Zentrale Bild-Fallback-Logik für alle Nachrichten-/Editorial-Komponenten.
 *
 * Warum:
 * - Externe Bild-Hosts (Unsplash) liefern gelegentlich 404, wenn Fotografen
 *   ihre Werke löschen. Der Server-Validator prüft nur zum Zeitpunkt der
 *   Publikation.
 * - Alle News-Rendering-Stellen brauchen dieselben drei Fallback-Stufen:
 *     1. image_url (Original)
 *     2. Kategorie-Fallback (lokal, deterministisch)
 *     3. Neutraler Editorial-Placeholder als Data-URI (nie 404, nie CORS)
 *
 * Bewusst KEINE externe URL für die letzte Fallback-Stufe: eine SVG als
 * data:image/svg+xml — der Browser lädt nichts mehr nach.
 *
 * Nutzung:
 *   import { getNewsFallbackImage, LOCAL_NEWS_PLACEHOLDER } from '@/lib/news/newsImage';
 *   // in onError-Handler:
 *   const img = e.currentTarget;
 *   if (!img.dataset.fbApplied) {
 *     img.dataset.fbApplied = '1';
 *     img.src = getNewsFallbackImage(category);
 *     return;
 *   }
 *   img.src = LOCAL_NEWS_PLACEHOLDER; // finaler Stopp
 *
 * Für neue Komponenten: bevorzugt <SafeNewsImage /> verwenden — kapselt die
 * Logik inklusive „Bildcontainer komplett entfernen bei finalem Fehler".
 */

// -------------------------------------------------------------------------
// Editorial-Placeholder (Stufe 3) — reine CSS/SVG-Fläche.
// Kein HTTP-Request, kein CORS, kein Cache-Bust nötig.
// -------------------------------------------------------------------------
const buildPlaceholderSvg = (label = 'Fröhlich Vermögensberatung') => {
  const safeLabel = String(label).replace(/[<>&]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0f1d34"/>
        <stop offset="1" stop-color="#1a2c4d"/>
      </linearGradient>
      <pattern id="dots" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="1" fill="#c9a961" fill-opacity="0.10"/>
      </pattern>
    </defs>
    <rect width="800" height="450" fill="url(#g)"/>
    <rect width="800" height="450" fill="url(#dots)"/>
    <line x1="60" y1="360" x2="740" y2="360" stroke="#c9a961" stroke-opacity="0.35" stroke-width="1"/>
    <text x="60" y="345" fill="#c9a961" font-family="Courier New, monospace" font-size="16" letter-spacing="4">EDITORIAL</text>
    <text x="60" y="410" fill="#f4efe3" font-family="Georgia, serif" font-size="26" font-style="italic">${safeLabel}</text>
  </svg>`;
  // encodeURIComponent → funktioniert in allen Browsern, keine base64-Kosten.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const LOCAL_NEWS_PLACEHOLDER = buildPlaceholderSvg();

// -------------------------------------------------------------------------
// Kategorie-Fallback (Stufe 2) — deterministisches lokales SVG pro Kategorie.
// Nutzt Fröhlich-Farbwelt (Navy + Gold), kein externer Host.
// -------------------------------------------------------------------------
const CATEGORY_LABEL = {
  wirtschaft: 'Wirtschaft',
  maerkte: 'Märkte',
  unternehmen: 'Unternehmen',
  zinsen: 'Zinsen',
  'fonds-etfs': 'Fonds & ETFs',
  fonds: 'Fonds & ETFs',
  etf: 'Fonds & ETFs',
  aktien: 'Aktien',
  europa: 'Europa',
  welt: 'Welt',
  politik: 'Politik',
  rohstoffe: 'Rohstoffe',
  energie: 'Energie',
  technologie: 'Technologie',
  industrie: 'Industrie',
  waehrungen: 'Währungen',
  klima: 'Klima',
  mobilitaet: 'Mobilität',
  gesundheit: 'Gesundheit',
  sicherheit: 'Sicherheit',
  wissen: 'Wissen',
  international: 'International',
  umwelt: 'Umwelt',
  kultur: 'Kultur',
  sport: 'Sport',
  videos: 'Videos',
};

const _cache = new Map();

export const getNewsFallbackImage = (category) => {
  const key = String(category || 'editorial').toLowerCase();
  if (_cache.has(key)) return _cache.get(key);
  const label = CATEGORY_LABEL[key] || 'Fröhlich Vermögensberatung';
  const url = buildPlaceholderSvg(label);
  _cache.set(key, url);
  return url;
};

// -------------------------------------------------------------------------
// onError-Handler (2-Stufen: Kategorie-Fallback → finaler Placeholder)
// -------------------------------------------------------------------------
export const attachNewsImageErrorHandler = (event, category) => {
  const img = event.currentTarget;
  if (!img) return;
  if (!img.dataset.fbStage || img.dataset.fbStage === '0') {
    img.dataset.fbStage = '1';
    img.src = getNewsFallbackImage(category);
    return 'category';
  }
  if (img.dataset.fbStage === '1') {
    img.dataset.fbStage = '2';
    img.src = LOCAL_NEWS_PLACEHOLDER;
    return 'placeholder';
  }
  // Auch der Placeholder ist gescheitert (dürfte nie passieren, da inline).
  // Wir stoppen jede weitere Iteration.
  img.dataset.fbStage = 'final';
  img.style.display = 'none';
  return 'hidden';
};
