/** Market ticker only on trading-related dashboard routes. */
export function shouldShowMarketTicker(pathname = '') {
  if (pathname.startsWith('/dashboard/handeln')) return true;
  if (pathname.startsWith('/dashboard/aktien')) return true;
  return false;
}
