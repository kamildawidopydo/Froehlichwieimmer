// Supabase Edge Function: send-stock-email
// - Sends stock-order related notification emails via Resend
// - Types: 'submitted' | 'executed' | 'rejected' | 'cancelled'
//
// Env vars required:
//   RESEND_API_KEY    - Resend API key
//   SENDER_EMAIL      - verified sender (e.g. "Kapitalmitte <kundenservice@kapitalmitte.com>")
//
// Deploy:
//   supabase functions deploy send-stock-email --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { resolveResendFrom } from '../_shared/resendSender.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as Sentry from 'npm:@sentry/deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface OrderPayload {
  type: 'submitted' | 'executed' | 'rejected' | 'cancelled';
  to: string;
  user_name?: string;
  order: {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    requested_price?: number | null;
    executed_price?: number | null;
    total?: number | null;
    /** Brutto vor Rabatt (optional, z. B. bei Gutschein) */
    gross_amount?: number | null;
    discount_percent?: number | null;
    discount_amount?: number | null;
    net_amount?: number | null;
    currency?: string;
    note?: string | null;
    rejection_reason?: string | null;
    created_at?: string;
  };
}

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
const AMBER = '#f59e0b';

const SENTRY_DSN = Deno.env.get('SENTRY_DSN') ?? '';
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: Deno.env.get('SUPABASE_ENV') ?? 'production',
  });
}

const baseStyles = `
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${BG}; color: ${TEXT}; }
  .wrap { max-width: 600px; margin: 0 auto; background: #ffffff; }
  .header { background: linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_HOVER} 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
  .brand { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
  .subtitle { font-size: 13px; opacity: 0.85; margin-top: 4px; }
  .accent-bar { height: 3px; background: ${ACCENT}; }
  .body { padding: 32px 28px; }
  h1 { font-size: 20px; margin: 0 0 14px; color: ${TEXT}; font-weight: 700; }
  p { font-size: 14px; line-height: 1.6; color: ${TEXT_MUTED}; margin: 0 0 14px; }
  .order-card { background: ${BG}; border: 1px solid ${BORDER}; border-radius: 10px; padding: 18px; margin: 20px 0; }
  .order-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid ${BORDER}; }
  .order-row:last-child { border-bottom: none; }
  .order-label { color: ${TEXT_MUTED}; }
  .order-val { color: ${TEXT}; font-weight: 600; text-align: right; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
  .badge-buy { background: #d1fae5; color: ${GREEN}; }
  .badge-sell { background: #fee2e2; color: ${RED}; }
  .badge-executed { background: #d1fae5; color: ${GREEN}; }
  .badge-rejected { background: #fee2e2; color: ${RED}; }
  .badge-pending { background: #fef3c7; color: ${AMBER}; }
  .note { background: #fff7ed; border-left: 3px solid ${AMBER}; padding: 12px 14px; border-radius: 4px; font-size: 13px; color: ${TEXT}; margin: 16px 0; }
  .footer { padding: 20px 24px; text-align: center; background: ${BG}; border-top: 1px solid ${BORDER}; color: ${TEXT_MUTED}; font-size: 11px; line-height: 1.5; }
  .btn { display: inline-block; padding: 11px 22px; background: ${PRIMARY}; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; margin-top: 8px; }
`;

const renderHeader = () => `
  <div class="header">
    <div class="brand">${BRAND}</div>
    <div class="subtitle">Ihre Vermögensplattform</div>
  </div>
  <div class="accent-bar"></div>
`;

const renderFooter = () => `
  <div class="footer">
    <p style="margin: 0; color: ${TEXT_MUTED};">
      Diese E-Mail wurde automatisch versendet. Bitte antworten Sie nicht auf diese Nachricht.<br/>
      &copy; ${new Date().getFullYear()} ${BRAND}
    </p>
  </div>
`;

const fmtQty = (n: number) => Number(n).toLocaleString('de-DE', { maximumFractionDigits: 6 });
const fmtPrice = (n: number, currency = 'USD') =>
  Number(n).toLocaleString('de-DE', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 4 });

const buildOrderCard = (o: OrderPayload['order']) => {
  const sideBadge = o.side === 'buy'
    ? '<span class="badge badge-buy">Kauf</span>'
    : '<span class="badge badge-sell">Verkauf</span>';
  const currency = o.currency || 'USD';
  const gross = o.gross_amount ?? (o.requested_price != null ? o.requested_price * o.quantity : null);
  const hasDisc = o.discount_percent != null && Number(o.discount_percent) > 0 && o.side === 'buy';
  const discAmt = o.discount_amount ?? (hasDisc && gross != null
    ? Math.round(Number(gross) * (Number(o.discount_percent) / 100) * 100) / 100
    : null);
  const netFromParts = gross != null && discAmt != null ? Math.round((Number(gross) - discAmt) * 100) / 100 : null;
  const total = o.net_amount ?? o.total ?? (o.executed_price ? o.executed_price * o.quantity : (o.requested_price ? o.requested_price * o.quantity : null));

  return `
    <div class="order-card">
      <div class="order-row">
        <span class="order-label">Symbol</span>
        <span class="order-val">${o.symbol}</span>
      </div>
      <div class="order-row">
        <span class="order-label">Seite</span>
        <span class="order-val">${sideBadge}</span>
      </div>
      <div class="order-row">
        <span class="order-label">Stückzahl</span>
        <span class="order-val">${fmtQty(o.quantity)}</span>
      </div>
      ${o.requested_price != null ? `
      <div class="order-row">
        <span class="order-label">Referenzkurs</span>
        <span class="order-val">${fmtPrice(o.requested_price, currency)}</span>
      </div>` : ''}
      ${o.executed_price != null ? `
      <div class="order-row">
        <span class="order-label">Ausführungskurs</span>
        <span class="order-val">${fmtPrice(o.executed_price, currency)}</span>
      </div>` : ''}
      ${gross != null && hasDisc ? `
      <div class="order-row">
        <span class="order-label">Brutto</span>
        <span class="order-val">${fmtPrice(Number(gross), currency)}</span>
      </div>
      <div class="order-row">
        <span class="order-label">Rabatt (${Number(o.discount_percent).toLocaleString('de-DE', { maximumFractionDigits: 2 })}%)</span>
        <span class="order-val">− ${fmtPrice(Number(discAmt ?? 0), currency)}</span>
      </div>
      <div class="order-row">
        <span class="order-label">Netto</span>
        <span class="order-val">${fmtPrice(Number(netFromParts ?? total ?? 0), currency)}</span>
      </div>` : ''}
      ${!(gross != null && hasDisc) && total != null ? `
      <div class="order-row">
        <span class="order-label">Gesamtbetrag</span>
        <span class="order-val">${fmtPrice(Number(total), currency)}</span>
      </div>` : ''}
      ${o.created_at ? `
      <div class="order-row">
        <span class="order-label">Eingereicht am</span>
        <span class="order-val">${new Date(o.created_at).toLocaleString('de-DE')}</span>
      </div>` : ''}
    </div>
  `;
};

const templates = {
  submitted: (p: OrderPayload) => ({
    subject: `Auftrag eingegangen: ${p.order.side === 'buy' ? 'Kauf' : 'Verkauf'} ${p.order.symbol}`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
      <div class="wrap">
        ${renderHeader()}
        <div class="body">
          <h1>Ihr Auftrag ist eingegangen</h1>
          <p>Hallo ${p.user_name || 'Kunde'},</p>
          <p>wir haben Ihren Auftrag erhalten und leiten diesen an unser Team zur Prüfung weiter. Sie erhalten eine weitere Benachrichtigung, sobald der Auftrag ausgeführt oder abgelehnt wurde.</p>
          ${buildOrderCard(p.order)}
          ${p.order.note ? `<div class="note"><strong>Ihre Notiz:</strong> ${p.order.note}</div>` : ''}
          <p style="color: ${TEXT_MUTED}; font-size: 12px;">Status: <span class="badge badge-pending">Ausstehend</span></p>
        </div>
        ${renderFooter()}
      </div>
    </body></html>`,
  }),
  executed: (p: OrderPayload) => ({
    subject: `Auftrag ausgeführt: ${p.order.side === 'buy' ? 'Kauf' : 'Verkauf'} ${p.order.symbol}`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
      <div class="wrap">
        ${renderHeader()}
        <div class="body">
          <h1>Auftrag erfolgreich ausgeführt</h1>
          <p>Hallo ${p.user_name || 'Kunde'},</p>
          <p>Ihr Auftrag wurde soeben ausgeführt und Ihrem Depot bzw. Kontoguthaben gutgeschrieben.</p>
          ${buildOrderCard(p.order)}
          <p style="color: ${TEXT_MUTED}; font-size: 12px;">Status: <span class="badge badge-executed">Ausgeführt</span></p>
          <p style="font-size: 13px;">Sie können Ihre aktuellen Positionen jederzeit in Ihrem Dashboard einsehen.</p>
        </div>
        ${renderFooter()}
      </div>
    </body></html>`,
  }),
  rejected: (p: OrderPayload) => ({
    subject: `Auftrag abgelehnt: ${p.order.side === 'buy' ? 'Kauf' : 'Verkauf'} ${p.order.symbol}`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
      <div class="wrap">
        ${renderHeader()}
        <div class="body">
          <h1>Auftrag konnte nicht ausgeführt werden</h1>
          <p>Hallo ${p.user_name || 'Kunde'},</p>
          <p>leider musste Ihr Auftrag abgelehnt werden. Bitte überprüfen Sie den untenstehenden Grund und reichen Sie den Auftrag bei Bedarf erneut ein.</p>
          ${buildOrderCard(p.order)}
          ${p.order.rejection_reason ? `<div class="note"><strong>Grund:</strong> ${p.order.rejection_reason}</div>` : ''}
          <p style="color: ${TEXT_MUTED}; font-size: 12px;">Status: <span class="badge badge-rejected">Abgelehnt</span></p>
        </div>
        ${renderFooter()}
      </div>
    </body></html>`,
  }),
  cancelled: (p: OrderPayload) => ({
    subject: `Auftrag storniert: ${p.order.side === 'buy' ? 'Kauf' : 'Verkauf'} ${p.order.symbol}`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
      <div class="wrap">
        ${renderHeader()}
        <div class="body">
          <h1>Auftrag storniert</h1>
          <p>Hallo ${p.user_name || 'Kunde'},</p>
          <p>Ihr Auftrag wurde storniert und wird nicht ausgeführt.</p>
          ${buildOrderCard(p.order)}
        </div>
        ${renderFooter()}
      </div>
    </body></html>`,
  }),
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const ADMIN_FUNCTION_SECRET = Deno.env.get('ADMIN_FUNCTION_SECRET') ?? '';
    if (!SUPABASE_URL || !SERVICE_KEY) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured');
    }
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const headerSecret = req.headers.get('x-admin-secret') || '';
    let callerRole: 'admin' | 'user' | null = null;
    let callerEmail: string | null = null;
    if (ADMIN_FUNCTION_SECRET && headerSecret === ADMIN_FUNCTION_SECRET) {
      callerRole = 'admin';
    } else {
      const authHeader = req.headers.get('authorization') ?? '';
      const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
      if (!token) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: authData, error: authErr } = await adminClient.auth.getUser(token);
      if (authErr || !authData?.user?.id) {
        return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      callerEmail = authData.user.email ?? null;
      const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle();
      callerRole = profile?.role === 'admin' ? 'admin' : 'user';
    }

    const payload = (await req.json()) as OrderPayload;
    if (!payload?.type || !payload?.to || !payload?.order) {
      return new Response(JSON.stringify({ error: 'invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tpl = templates[payload.type]?.(payload);
    if (!tpl) {
      return new Response(JSON.stringify({ error: `unknown type: ${payload.type}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const SENDER_EMAIL = resolveResendFrom(Deno.env.get('SENDER_EMAIL'));
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if ((payload.type === 'executed' || payload.type === 'rejected') && callerRole !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin role required for this email type' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if ((payload.type === 'submitted' || payload.type === 'cancelled') && callerRole !== 'admin') {
      if (!callerEmail || callerEmail.toLowerCase() !== payload.to.toLowerCase()) {
        return new Response(JSON.stringify({ error: 'Recipient mismatch for user-triggered mail' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to: [payload.to],
        subject: tpl.subject,
        html: tpl.html,
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Resend ${res.status}`, detail: body }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, resend: JSON.parse(body || '{}') }), {
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
