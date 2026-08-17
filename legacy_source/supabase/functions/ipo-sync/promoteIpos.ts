import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

type IpoRow = {
  id: string;
  company_name: string;
  ticker_proposed: string | null;
  exchange: string | null;
  market: string | null;
  sector: string | null;
  ipo_date: string | null;
  status: string;
  price_currency: string | null;
  display_order: number | null;
  logo_url: string | null;
};

const LOCATION_SUFFIX: [RegExp, string][] = [
  [/paris/i, '.PA'],
  [/amsterdam/i, '.AS'],
  [/brussels/i, '.BR'],
  [/lisbon/i, '.LS'],
  [/oslo/i, '.OL'],
  [/milan|borsa italiana/i, '.MI'],
  [/dublin/i, '.IR'],
  [/copenhagen/i, '.CO'],
  [/helsinki/i, '.HE'],
  [/stockholm/i, '.ST'],
  [/frankfurt|xetra/i, '.DE'],
  [/madrid/i, '.MC'],
  [/warsaw/i, '.WA'],
  [/vienna/i, '.VI'],
];

export function resolveStockSymbol(row: IpoRow): string | null {
  const raw = row.ticker_proposed?.trim();
  if (!raw) return null;
  if (raw.includes('.')) return raw.toUpperCase();

  const hay = `${row.exchange || ''} ${row.market || ''}`;
  if (/nasdaq|nyse|us\b|arca/i.test(hay)) return raw.toUpperCase();

  for (const [pattern, suffix] of LOCATION_SUFFIX) {
    if (pattern.test(hay)) return `${raw.toUpperCase()}${suffix}`;
  }

  return raw.toUpperCase();
}

function resolveCurrency(row: IpoRow): string {
  if (row.price_currency) return row.price_currency;
  const hay = `${row.exchange || ''} ${row.market || ''}`.toLowerCase();
  if (/nasdaq|nyse|us\b/.test(hay)) return 'USD';
  if (/london|lse/.test(hay)) return 'GBP';
  if (/zurich|six/.test(hay)) return 'CHF';
  return 'EUR';
}

export async function promoteListedIpos(
  admin: SupabaseClient,
): Promise<{ promoted: number; errors: string[] }> {
  const errors: string[] = [];
  let promoted = 0;

  const { data: rows, error } = await admin
    .from('ipo_catalog')
    .select(
      'id, company_name, ticker_proposed, exchange, market, sector, ipo_date, status, price_currency, display_order, logo_url',
    )
    .eq('is_visible', true)
    .not('ticker_proposed', 'is', null)
    .eq('status', 'listed');

  if (error) {
    return { promoted: 0, errors: [`promote query: ${error.message}`] };
  }

  for (const row of (rows ?? []) as IpoRow[]) {
    const symbol = resolveStockSymbol(row);
    if (!symbol) continue;

    const stockPayload = {
      symbol,
      name: row.company_name,
      exchange: row.exchange || row.market || null,
      currency: resolveCurrency(row),
      sector: row.sector || null,
      logo_url: row.logo_url || null,
      is_active: true,
      display_order: Math.max(50, row.display_order ?? 50),
    };

    const { error: stockErr } = await admin.from('stocks').upsert(stockPayload, {
      onConflict: 'symbol',
    });
    if (stockErr) {
      errors.push(`stock ${symbol}: ${stockErr.message}`);
      continue;
    }

    const { error: ipoErr } = await admin
      .from('ipo_catalog')
      .update({
        status: 'listed',
        is_visible: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (ipoErr) {
      errors.push(`ipo ${row.id}: ${ipoErr.message}`);
      continue;
    }

    promoted += 1;
  }

  return { promoted, errors };
}
