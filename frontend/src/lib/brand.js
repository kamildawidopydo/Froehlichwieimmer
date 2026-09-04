/** Fröhlich Vermögensberatung mark — favicon used in dashboard shell & marketing mockups. */
export const BRAND_FAVICON_SRC = '/assets/favicon/android-chrome-192x192.png';

/** Site lockup — real alpha-channel PNG (background removed, blue letters on transparent).
 *  Session 80.66 fix: previous `frohlich-logo.png` was Palette-mode w/o alpha and
 *  `frohlich-logo-transparent.png` was RGBA but fully opaque (alpha=255 everywhere) —
 *  produced a white card behind the wordmark. Replaced by `frohlich-logo-clear.png`
 *  generated from the original via alpha-threshold + anti-alias ramp. */
export const BRAND_LOGO_SRC = '/assets/logo/frohlich-logo-clear.png?v=1';

/**
 * Dark surfaces (nav/footer): same clear lockup — dark-mode CSS turns letters white.
 */
export const BRAND_LOGO_ON_DARK_SRC = '/assets/logo/frohlich-logo-clear.png?v=1';

/** Raster lockup for email / OG (opaque flavour kept for external clients that
 *  don't handle alpha PNGs reliably, e.g. some mail renderers). */
export const BRAND_LOGO_PNG_SRC = '/assets/logo/frohlich-logo-clear.png?v=1';
export const BRAND_LOGO_EMAIL_SRC =
  'https://kapital-direkt24.de/assets/logo/frohlich-logo.png?v=4';

export const BRAND_MARK_SRC = '/assets/logo/frohlich-mark.png?v=4';
