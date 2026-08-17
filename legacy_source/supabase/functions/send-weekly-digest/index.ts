// Supabase Edge Function: send-weekly-digest
// Sends a personalised weekly portfolio summary to every approved user.
//
// Modes:
//   { mode: 'all' }           -> iterate over all approved users with digest enabled
//   { mode: 'single', user_id: '...' } -> send to a single user (admin test)
//
// Env vars:
//   RESEND_API_KEY
//   SENDER_EMAIL
//   SUPABASE_URL            (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY (auto-injected)
//   APP_URL                 optional, used for the dashboard link in the mail
//
// Deploy:
//   npx supabase functions deploy send-weekly-digest --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { resolveResendFrom } from '../_shared/resendSender.ts';
import * as Sentry from 'npm:@sentry/deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BRAND = 'Kapitalmitte';
const PRIMARY = '#0a3a5c';
const PRIMARY_HOVER = '#0d4a76';
const ACCENT = '#d4a847';
const BG = '#f5f7fa';
const TEXT = '#1a2332';
const TEXT_MUTED = '#5a6b7d';
const BORDER = '#e1e6ed';
const GREEN = '#10b981';
const RED = '#ef4444';

const fmtEUR = (n: number) =>
  Number(n || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtEURShort = (n: number) =>
  Number(n || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const styles = `
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${BG}; color: ${TEXT}; }
  .wrap { max-width: 600px; margin: 0 auto; background: #ffffff; }
  .header { background: linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_HOVER} 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
  .brand { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
  .subtitle { font-size: 13px; opacity: 0.85; margin-top: 4px; }
  .accent-bar { height: 3px; background: ${ACCENT}; }
  .body { padding: 32px 28px; }
  h1 { font-size: 22px; margin: 0 0 6px; color: ${TEXT}; font-weight: 700; }
  h2 { font-size: 15px; margin: 26px 0 10px; color: ${TEXT}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  p { font-size: 14px; line-height: 1.6; color: ${TEXT_MUTED}; margin: 0 0 14px; }
  .hero-card { background: linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_HOVER} 100%); color: #ffffff; border-radius: 10px; padding: 22px 20px; margin: 18px 0 8px; }
  .hero-label { font-size: 11px; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.6px; }
  .hero-value { font-size: 30px; font-weight: 700; margin-top: 2px; }
  .hero-change { font-size: 13px; margin-top: 6px; font-weight: 500; }
  .chg-up { color: #a7f3d0; }
  .chg-down { color: #fecaca; }
  table.stats { width: 100%; border-collapse: collapse; margin: 8px 0; }
  table.stats td { padding: 9px 0; border-bottom: 1px solid ${BORDER}; font-size: 13px; }
  table.stats td.lbl { color: ${TEXT_MUTED}; }
  table.stats td.val { text-align: right; color: ${TEXT}; font-weight: 600; }
  table.stats tr:last-child td { border-bottom: none; }
  .pos-card { background: ${BG}; border: 1px solid ${BORDER}; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; }
  .pos-row { display: flex; justify-content: space-between; align-items: center; }
  .pos-symbol { font-weight: 700; color: ${TEXT}; font-size: 14px; }
  .pos-name { font-size: 11px; color: ${TEXT_MUTED}; margin-top: 1px; }
  .pos-value { text-align: right; font-weight: 600; font-size: 14px; color: ${TEXT}; }
  .pos-pct { font-size: 11px; margin-top: 1px; }
  .pos-pct.up { color: ${GREEN}; }
  .pos-pct.down { color: ${RED}; }
  .empty { padding: 14px; text-align: center; color: ${TEXT_MUTED}; font-size: 13px; background: ${BG}; border-radius: 8px; }
  .cta { display: inline-block; padding: 12px 24px; background: ${PRIMARY}; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; }
  .cta-row { text-align: center; margin: 24px 0 8px; }
  .footer { padding: 20px 24px; text-align: center; background: ${BG}; border-top: 1px solid ${BORDER}; color: ${TEXT_MUTED}; font-size: 11px; line-height: 1.6; }
  .footer a { color: ${PRIMARY}; }
`;

interface Profile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  cash_balance?: number | null;
  email_digest_enabled?: boolean | null;
  status?: string | null;
}

const SENTRY_DSN = Deno.env.get('SENTRY_DSN') ?? '';
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: Deno.env.get('SUPABASE_ENV') ?? 'production',
  });
}

interface DigestData {
  totalNow: number;
  total7dAgo: number | null;
  cash: number;
  stocksValue: number;
  bondsValue: number;
  contractsValue: number;
  positions: { symbol: string; name: string; qty: number; value: number; weekPct: number | null }[];
  newOrders: { symbol: string; side: string; qty: number; status: string; created_at: string }[];
  cashTx: { amount: number; type: string; description: string | null; created_at: string }[];
}

const fetchJson = async (url: string, token: string, init: RequestInit = {}) => {
  const r = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      apikey: token,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Supabase ${r.status}: ${t}`);
  }
  return await r.json();
};

const buildDigest = async (user: Profile, supabaseUrl: string, serviceKey: string): Promise<DigestData> => {
  const base = `${supabaseUrl}/rest/v1`;
  const uid = user.id;
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400 * 1000).toISOString();
  const d7Date = d7.slice(0, 10);

  // Positions + prices
  const [positions, cache, stocksMeta, bonds, contracts, snapshots, orders, tx] = await Promise.all([
    fetchJson(`${base}/user_stock_positions?select=symbol,quantity,avg_cost&user_id=eq.${uid}`, serviceKey),
    fetchJson(`${base}/stock_prices_cache?select=symbol,price,change_pct`, serviceKey),
    fetchJson(`${base}/stocks?select=symbol,name`, serviceKey),
    fetchJson(`${base}/user_bond_positions?select=nominal_betrag,aktueller_kurs,is_active&user_id=eq.${uid}&is_active=eq.true`, serviceKey),
    fetchJson(`${base}/user_depot_contracts?select=amount_eur,is_active&user_id=eq.${uid}&is_active=eq.true`, serviceKey),
    fetchJson(`${base}/user_portfolio_snapshots?select=snapshot_date,total_value&user_id=eq.${uid}&snapshot_date=gte.${d7Date}&order=snapshot_date.asc`, serviceKey),
    fetchJson(`${base}/user_stock_orders?select=symbol,side,quantity,status,created_at&user_id=eq.${uid}&created_at=gte.${d7}&order=created_at.desc&limit=10`, serviceKey),
    fetchJson(`${base}/user_cash_transactions?select=amount,type,description,created_at&user_id=eq.${uid}&created_at=gte.${d7}&order=created_at.desc&limit=10`, serviceKey),
  ]);

  const priceMap: Record<string, { price: number; change_pct: number | null }> = {};
  (cache as any[]).forEach((c: any) => {
    priceMap[c.symbol] = { price: Number(c.price || 0), change_pct: c.change_pct == null ? null : Number(c.change_pct) };
  });
  const nameMap: Record<string, string> = {};
  (stocksMeta as any[]).forEach((s: any) => { nameMap[s.symbol] = s.name; });

  let stocksValue = 0;
  const posRows = (positions as any[]).map((p: any) => {
    const qty = Number(p.quantity || 0);
    const priceObj = priceMap[p.symbol];
    const price = priceObj?.price ?? Number(p.avg_cost || 0);
    const value = qty * price;
    stocksValue += value;
    return {
      symbol: p.symbol,
      name: nameMap[p.symbol] || p.symbol,
      qty,
      value,
      weekPct: priceObj?.change_pct ?? null,
    };
  }).sort((a, b) => b.value - a.value).slice(0, 6);

  const bondsValue = (bonds as any[]).reduce((s: number, b: any) =>
    s + (Number(b.nominal_betrag || 0) * Number(b.aktueller_kurs || 100)) / 100, 0);
  const contractsValue = (contracts as any[]).reduce((s: number, c: any) => s + Number(c.amount_eur || 0), 0);
  const cash = Number(user.cash_balance || 0);
  const totalNow = cash + stocksValue + bondsValue + contractsValue;

  const snapArr = snapshots as any[];
  const total7dAgo = snapArr.length > 0 ? Number(snapArr[0].total_value || 0) : null;

  return {
    totalNow,
    total7dAgo,
    cash,
    stocksValue,
    bondsValue,
    contractsValue,
    positions: posRows,
    newOrders: (orders as any[]).map((o: any) => ({
      symbol: o.symbol,
      side: o.side,
      qty: Number(o.quantity || 0),
      status: o.status,
      created_at: o.created_at,
    })),
    cashTx: (tx as any[]).map((t: any) => ({
      amount: Number(t.amount || 0),
      type: t.type,
      description: t.description,
      created_at: t.created_at,
    })),
  };
};

const renderEmail = (user: Profile, d: DigestData, appUrl: string) => {
  const firstName = user.first_name || 'Kunde';
  const weekStart = new Date(Date.now() - 7 * 86400 * 1000).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  const weekEnd = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });

  const changeAbs = d.total7dAgo != null ? d.totalNow - d.total7dAgo : 0;
  const changePct = d.total7dAgo != null && d.total7dAgo > 0 ? (changeAbs / d.total7dAgo) * 100 : 0;
  const up = changeAbs >= 0;

  const positionsHtml = d.positions.length > 0
    ? d.positions.map((p) => {
        const pctHtml = p.weekPct != null
          ? `<div class="pos-pct ${p.weekPct >= 0 ? 'up' : 'down'}">${fmtPct(p.weekPct)} (24h)</div>`
          : '';
        return `
          <div class="pos-card">
            <div class="pos-row">
              <div>
                <div class="pos-symbol">${p.symbol}</div>
                <div class="pos-name">${p.name} · ${Number(p.qty).toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stück</div>
              </div>
              <div>
                <div class="pos-value">${fmtEUR(p.value)}</div>
                ${pctHtml}
              </div>
            </div>
          </div>`;
      }).join('')
    : '<div class="empty">Noch keine Aktienpositionen</div>';

  const ordersHtml = d.newOrders.length > 0
    ? `<table class="stats">
        ${d.newOrders.map((o) => {
          const sideLbl = o.side === 'buy' ? 'Kauf' : 'Verkauf';
          const statusLbl = { pending: 'Offen', executed: 'Ausgeführt', rejected: 'Abgelehnt', cancelled: 'Storniert' }[o.status] || o.status;
          return `<tr>
            <td class="lbl">${new Date(o.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} · ${sideLbl} ${o.symbol}</td>
            <td class="val">${Number(o.qty).toLocaleString('de-DE', { maximumFractionDigits: 4 })} · ${statusLbl}</td>
          </tr>`;
        }).join('')}
      </table>`
    : '<div class="empty">Keine neuen Aufträge diese Woche</div>';

  const txHtml = d.cashTx.length > 0
    ? `<table class="stats">
        ${d.cashTx.map((t) => {
          const sign = t.amount >= 0 ? '+' : '';
          const color = t.amount >= 0 ? GREEN : RED;
          return `<tr>
            <td class="lbl">${new Date(t.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} · ${t.description || t.type}</td>
            <td class="val" style="color: ${color};">${sign}${fmtEUR(Math.abs(t.amount)) /* avoid double minus */}</td>
          </tr>`;
        }).join('')}
      </table>`
    : '<div class="empty">Keine Kontobewegungen diese Woche</div>';

  const unsubUrl = `${appUrl}/dashboard?tab=profile`;
  const dashUrl = `${appUrl}/dashboard`;

  const subject = `Ihre Woche im Überblick · ${fmtEURShort(d.totalNow)} ${d.total7dAgo != null ? `(${fmtPct(changePct)})` : ''}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${styles}</style></head><body>
    <div class="wrap">
      <div class="header">
        <div class="brand">${BRAND}</div>
        <div class="subtitle">Wochenbericht · ${weekStart} – ${weekEnd}</div>
      </div>
      <div class="accent-bar"></div>
      <div class="body">
        <h1>Guten Morgen, ${firstName}</h1>
        <p>hier ist Ihre Zusammenfassung der letzten 7 Tage.</p>

        <div class="hero-card">
          <div class="hero-label">Gesamtvermögen</div>
          <div class="hero-value">${fmtEUR(d.totalNow)}</div>
          ${d.total7dAgo != null ? `
            <div class="hero-change ${up ? 'chg-up' : 'chg-down'}">
              ${up ? '▲' : '▼'} ${up ? '+' : ''}${fmtEUR(changeAbs)} (${fmtPct(changePct)}) ggü. Vorwoche
            </div>` : `<div class="hero-change" style="opacity: 0.7;">Noch keine Vorwochenvergleich verfügbar</div>`}
        </div>

        <table class="stats">
          <tr><td class="lbl">Kontoguthaben</td><td class="val">${fmtEUR(d.cash)}</td></tr>
          <tr><td class="lbl">Aktien-Depot</td><td class="val">${fmtEUR(d.stocksValue)}</td></tr>
          <tr><td class="lbl">Anleihen</td><td class="val">${fmtEUR(d.bondsValue)}</td></tr>
          <tr><td class="lbl">Festgeld · Tagesgeld · Flexgeld</td><td class="val">${fmtEUR(d.contractsValue)}</td></tr>
        </table>

        <h2>Top-Positionen</h2>
        ${positionsHtml}

        <h2>Aufträge (letzte 7 Tage)</h2>
        ${ordersHtml}

        <h2>Kontobewegungen (letzte 7 Tage)</h2>
        ${txHtml}

        <div class="cta-row">
          <a class="cta" href="${dashUrl}">Zum Dashboard</a>
        </div>
      </div>
      <div class="footer">
        <p style="margin: 0 0 6px;">Sie erhalten diese E-Mail, weil Sie ein aktives Konto bei ${BRAND} haben.</p>
        <p style="margin: 0;">
          <a href="${unsubUrl}">Wochenberichte abbestellen</a> · &copy; ${new Date().getFullYear()} ${BRAND}
        </p>
      </div>
    </div>
  </body></html>`;

  return { subject, html };
};

const sendEmail = async (to: string, subject: string, html: string, RESEND_API_KEY: string, SENDER_EMAIL: string) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: SENDER_EMAIL, to: [to], subject, html }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body}`);
  return JSON.parse(body || '{}');
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const SENDER_EMAIL = resolveResendFrom(Deno.env.get('SENDER_EMAIL'));
    const APP_URL = Deno.env.get('APP_URL') || 'https://www.kapitalmitte.com';
    const ADMIN_FUNCTION_SECRET = Deno.env.get('ADMIN_FUNCTION_SECRET') || '';

    if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing env vars' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json().catch(() => ({ mode: 'all' }));
    const mode = payload?.mode || 'all';

    const base = `${SUPABASE_URL}/rest/v1`;
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const headerSecret = req.headers.get('x-admin-secret') || '';
    const headerApiKey = req.headers.get('apikey') || '';
    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7)
      : '';
    let callerIsAdmin = false;
    if (ADMIN_FUNCTION_SECRET && headerSecret && headerSecret === ADMIN_FUNCTION_SECRET) {
      callerIsAdmin = true;
    } else if (
      (headerApiKey && headerApiKey === SERVICE_KEY) ||
      (bearerToken && bearerToken === SERVICE_KEY)
    ) {
      // Internal invocations signed with service_role (e.g. pg_net SQL cron).
      callerIsAdmin = true;
    } else {
      if (bearerToken) {
        const { data: authData } = await adminClient.auth.getUser(bearerToken);
        const callerId = authData?.user?.id;
        if (callerId) {
          const { data: callerProfile } = await adminClient
            .from('profiles')
            .select('role')
            .eq('id', callerId)
            .maybeSingle();
          callerIsAdmin = callerProfile?.role === 'admin';
        }
      }
    }

    if (!callerIsAdmin) {
      return new Response(JSON.stringify({ error: 'Admin authorization required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let users: Profile[] = [];

    if (mode === 'single') {
      if (!payload.user_id) {
        return new Response(JSON.stringify({ error: 'user_id required for single mode' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      users = await fetchJson(
        `${base}/profiles?select=id,first_name,last_name,email,cash_balance,email_digest_enabled,status&id=eq.${payload.user_id}`,
        SERVICE_KEY,
      );
    } else {
      users = await fetchJson(
        `${base}/weekly_digest_recipients?select=id,first_name,last_name,email,cash_balance,email_digest_enabled,status,notification_prefs`,
        SERVICE_KEY,
      );
    }

    const results: { user_id: string; email: string; ok: boolean; error?: string; resend_id?: string }[] = [];
    for (const u of users) {
      if (!u.email) { results.push({ user_id: u.id, email: '(no email)', ok: false, error: 'no email' }); continue; }
      try {
        const digest = await buildDigest(u, SUPABASE_URL, SERVICE_KEY);
        const { subject, html } = renderEmail(u, digest, APP_URL);
        const r = await sendEmail(u.email, subject, html, RESEND_API_KEY, SENDER_EMAIL);
        results.push({ user_id: u.id, email: u.email, ok: true, resend_id: r.id });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ user_id: u.id, email: u.email, ok: false, error: msg });
      }
    }

    const okCount = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({ success: true, sent: okCount, total: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (SENTRY_DSN) Sentry.captureException(err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
