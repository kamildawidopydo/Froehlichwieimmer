import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Session 82.47 — Zentrale SEO-Metatag-Komponente.
 *
 * Regeln:
 * 1. Kanonische Prod-Origin ist fix `https://kapital-direkt24.de`. Es wird NIE
 *    die Preview-Domain oder `window.location.origin` verwendet, damit Preview-
 *    Deployments niemals canonical werden können.
 * 2. Der übergebene `path` wird zum absoluten Canonical/OG-URL zusammengesetzt.
 *    Query-Parameter (`?utm=…`) und Hash (`#…`) werden aus dem Canonical
 *    entfernt.
 * 3. Es existiert genau EIN `<link rel="canonical">` pro Seite (das statische
 *    Canonical in `index.html` wurde entfernt).
 * 4. `og:image` wird auf eine absolute URL normalisiert.
 */

const DEFAULT_TITLE = 'Fröhlich Vermögensberatung | Ihre Investments. Alle Banken. Eine Plattform.';
const DEFAULT_DESCRIPTION =
  'Tagesgeld, Festgeld & mehr bei über 100 europäischen Banken – auf einer Plattform vergleichen und verwalten. Sicher, übersichtlich und unverbindlich mit Fröhlich Vermögensberatung.';
const DEFAULT_IMAGE = '/assets/logo/frohlich-logo.png?v=4';

// Kanonische Prod-Origin — bewusst hart codiert, nie aus window.location abgeleitet.
export const CANONICAL_ORIGIN = 'https://kapital-direkt24.de';

/**
 * Normalisiert einen Pfad zu einem absoluten Canonical-URL ohne Query/Hash.
 *   buildCanonicalUrl('/news/test?utm=x#foo') → 'https://kapital-direkt24.de/news/test'
 *   buildCanonicalUrl('news/test')             → 'https://kapital-direkt24.de/news/test'
 *   buildCanonicalUrl('/')                     → 'https://kapital-direkt24.de/'
 */
export function buildCanonicalUrl(rawPath) {
  const input = typeof rawPath === 'string' && rawPath.length > 0 ? rawPath : '/';
  // Query und Hash entfernen.
  const withoutHash = input.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  // Führenden Slash sicherstellen.
  const normalizedPath = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  return `${CANONICAL_ORIGIN}${normalizedPath}`;
}

/**
 * Normalisiert ein Bild zu einer absoluten URL. Externe URLs bleiben unverändert.
 */
function resolveImage(image) {
  const src = image || DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(src)) return src;
  const prefixed = src.startsWith('/') ? src : `/${src}`;
  return `${CANONICAL_ORIGIN}${prefixed}`;
}

const PageMeta = ({ title, description, path = '/', image, noIndex = false }) => {
  const resolvedTitle = title
    ? title.includes('Fröhlich Vermögensberatung')
      ? title
      : `Fröhlich Vermögensberatung | ${title}`
    : DEFAULT_TITLE;
  const resolvedDescription = description || DEFAULT_DESCRIPTION;
  const canonicalUrl = buildCanonicalUrl(path);
  const resolvedImage = resolveImage(image);

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Fröhlich Vermögensberatung" />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={resolvedImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={resolvedImage} />
      {noIndex ? <meta name="robots" content="noindex,nofollow" /> : null}
    </Helmet>
  );
};

export default PageMeta;
