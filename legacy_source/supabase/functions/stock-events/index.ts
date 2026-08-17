// Supabase Edge Function: stock-events
// Dividend ex-dates + earnings dates from Yahoo quoteSummary calendarEvents.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CalendarEvent {
  id: string;
  symbol: string;
  type: 'dividend' | 'earnings';
  label: string;
  date: string | null;
  amount: number | null;
}

async function fetchEvents(symbol: string): Promise<CalendarEvent[]> {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=calendarEvents`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  });
  if (!res.ok) return [];
  const json = await res.json();
  const cal = json?.quoteSummary?.result?.[0]?.calendarEvents;
  if (!cal) return [];
  const out: CalendarEvent[] = [];
  const divDate = cal.dividendDate?.fmt || cal.exDividendDate?.fmt || null;
  if (divDate) {
    out.push({
      id: `${symbol}-div`,
      symbol,
      type: 'dividend',
      label: 'Ex-Dividende',
      date: divDate,
      amount: null,
    });
  }
  const earnDate = cal.earnings?.earningsDate?.[0]?.fmt || cal.earningsDate?.fmt || null;
  if (earnDate) {
    out.push({
      id: `${symbol}-earn`,
      symbol,
      type: 'earnings',
      label: 'Ergebnisveröffentlichung',
      date: earnDate,
      amount: null,
    });
  }
  return out;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const symbols: string[] = Array.isArray(body?.symbols)
      ? body.symbols.filter((s: unknown) => typeof s === 'string').slice(0, 25)
      : [];
    const settled = await Promise.allSettled(symbols.map((s) => fetchEvents(s.toUpperCase())));
    const events: CalendarEvent[] = [];
    settled.forEach((r) => {
      if (r.status === 'fulfilled') events.push(...r.value);
    });
    events.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message, events: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
