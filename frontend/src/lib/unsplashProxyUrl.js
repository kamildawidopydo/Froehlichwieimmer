/**
 * Liefert eine same-origin-URL, die serverseitig images.unsplash.com nachlädt.
 * So umgehen Client-Netzwerke, die direkte Anfragen an Unsplash blockieren.
 *
 * @param {string} unsplashImageUrl — muss mit https://images.unsplash.com/ beginnen
 * @returns {string}
 */
export function proxiedUnsplashUrl(unsplashImageUrl) {
  if (
    typeof unsplashImageUrl !== 'string' ||
    !unsplashImageUrl.startsWith('https://images.unsplash.com/')
  ) {
    return unsplashImageUrl;
  }
  return `/api/unsplash-proxy?url=${encodeURIComponent(unsplashImageUrl)}`;
}
