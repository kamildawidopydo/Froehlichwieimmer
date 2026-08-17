import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/** Tickers that must never appear in IPO catalog (already public mega-caps). */
const BLOCKED_TICKERS = new Set(['SPCX', 'CBRS', 'KLAR', 'CHYM', 'FIG', 'STUB', 'HNGE']);

const BLOCKED_NAME_PATTERNS = [
  /space exploration technologies/i,
  /^spacex$/i,
];

export function isBlockedListedIpo(
  ticker: string | null | undefined,
  companyName: string | null | undefined,
): boolean {
  const t = ticker?.trim().toUpperCase();
  if (t && BLOCKED_TICKERS.has(t)) return true;
  const name = companyName?.trim() || '';
  return BLOCKED_NAME_PATTERNS.some((re) => re.test(name));
}

export async function purgeAlreadyListedIpos(
  admin: SupabaseClient,
): Promise<{ removed: number; errors: string[] }> {
  const errors: string[] = [];
  let removed = 0;
  const today = new Date().toISOString().slice(0, 10);

  const { data: stocks, error: stockErr } = await admin
    .from('stocks')
    .select('symbol')
    .eq('is_active', true);
  if (stockErr) {
    return { removed: 0, errors: [`stocks: ${stockErr.message}`] };
  }
  const activeSymbols = new Set((stocks ?? []).map((s) => String(s.symbol).toUpperCase()));

  const { data: ipos, error: ipoErr } = await admin
    .from('ipo_catalog')
    .select('id, ticker_proposed, company_name, source, is_manual_override, ipo_date, status')
    .eq('is_visible', true);
  if (ipoErr) {
    return { removed: 0, errors: [`ipo: ${ipoErr.message}`] };
  }

  const protectedSources = new Set(['sec_filed', 'manual']);

  for (const row of ipos ?? []) {
    if (row.is_manual_override && protectedSources.has(row.source)) continue;

    const ticker = row.ticker_proposed?.trim().toUpperCase() || '';
    const blocked = isBlockedListedIpo(row.ticker_proposed, row.company_name);
    const inStocks = ticker && activeSymbols.has(ticker);
    const pastIpo =
      row.ipo_date && String(row.ipo_date) < today &&
      ['stockanalysis', 'nasdaq', 'yahoo'].includes(row.source);
    const alreadyListed = row.status === 'listed';

    if (!blocked && !inStocks && !pastIpo && !alreadyListed) continue;

    const { error } = await admin
      .from('ipo_catalog')
      .update({
        status: 'listed',
        is_visible: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (error) {
      errors.push(`${row.id}: ${error.message}`);
    } else {
      removed += 1;
    }
  }

  // Hard-delete scraped SpaceX rows (any visibility)
  const { error: delErr } = await admin
    .from('ipo_catalog')
    .delete()
    .or('ticker_proposed.eq.SPCX,company_name.ilike.%Space Exploration Technologies%');

  if (delErr) errors.push(`delete spacex: ${delErr.message}`);

  return { removed, errors };
}
