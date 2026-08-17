import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { resolveResendFrom } from '../_shared/resendSender.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BRAND = 'Kapitalmitte';
const PRIMARY = '#0a3a5c';
const PRIMARY_HOVER = '#0d4a76';
const ACCENT = '#d4a847';
const BG = '#f5f7fa';
const TEXT = '#1a2332';
const MUTED = '#5a6b7d';
const BORDER = '#e1e6ed';

type RecipientType = 'customer' | 'admin';
type OutboxRow = {
  id: string;
  application_id: string;
  recipient_type: RecipientType;
  to_email: string;
  payload: Record<string, unknown>;
  attempt_count: number;
  max_attempts: number;
};

const emailStyles = `
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${BG}; color: ${TEXT}; }
  .wrap { max-width: 640px; margin: 0 auto; background: #ffffff; }
  .header { background: linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_HOVER} 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
  .brand { font-size: 22px; font-weight: 700; letter-spacing: .4px; }
  .sub { font-size: 12px; margin-top: 4px; opacity: .86; }
  .bar { height: 3px; background: ${ACCENT}; }
  .body { padding: 28px 24px; }
  h1 { margin: 0 0 12px; font-size: 22px; color: ${TEXT}; }
  p { margin: 0 0 12px; color: ${MUTED}; line-height: 1.55; font-size: 14px; }
  .card { margin: 18px 0; background: ${BG}; border: 1px solid ${BORDER}; border-radius: 10px; padding: 14px; }
  .row { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px solid ${BORDER}; }
  .row:last-child { border-bottom: none; }
  .k { color: ${MUTED}; font-size: 13px; }
  .v { color: ${TEXT}; font-size: 13px; font-weight: 600; text-align: right; }
  .btn { display: inline-block; margin-top: 8px; background: ${PRIMARY}; color: #fff !important; text-decoration: none; border-radius: 6px; padding: 10px 18px; font-size: 13px; font-weight: 600; }
  .footer { padding: 18px 24px; border-top: 1px solid ${BORDER}; text-align: center; font-size: 11px; color: ${MUTED}; background: ${BG}; }
`;

const renderHeader = (subtitle: string) => `
  <div class="header">
    <div class="brand">${BRAND}</div>
    <div class="sub">${subtitle}</div>
  </div>
  <div class="bar"></div>
`;

const renderFooter = () => `
  <div class="footer">
    Diese E-Mail wurde automatisch erstellt. Bitte antworten Sie nicht direkt auf diese Nachricht.<br/>
    &copy; ${new Date().getFullYear()} ${BRAND}
  </div>
`;

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('de-DE') : '-';

const fmtEUR = (value: unknown) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
};

const extractTemplateData = (payload: Record<string, unknown>) => {
  const personal = (payload.personal_data as Record<string, unknown>) || {};
  const investment = (payload.investment_data as Record<string, unknown>) || {};
  const appCreatedAt = payload.created_at as string | undefined;

  const firstName = String(personal.first_name || '').trim();
  const lastName = String(personal.last_name || '').trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Kunde';

  return {
    fullName,
    customerEmail: String(personal.email || '').trim(),
    phone: String(personal.phone || '').trim(),
    bankName: String(investment.bank_name || '–'),
    amount: fmtEUR(investment.investment_amount),
    termMonths: investment.term_months ? `${investment.term_months} Monate` : '–',
    interestRate: investment.interest_rate ? `${investment.interest_rate}% p.a.` : '–',
    taxId: String(investment.tax_id || '–'),
    appCreatedAt: fmtDate(appCreatedAt),
  };
};

const customerTemplate = (payload: Record<string, unknown>) => {
  const d = extractTemplateData(payload);
  return {
    subject: 'Ihre Anfrage ist bei Kapitalmitte eingegangen',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${emailStyles}</style></head><body>
      <div class="wrap">
        ${renderHeader('Eingangsbestätigung')}
        <div class="body">
          <h1>Vielen Dank, ${d.fullName}</h1>
          <p>wir haben Ihren Antrag erhalten und zur Bearbeitung aufgenommen.</p>
          <p>Unser Team meldet sich in der Regel innerhalb von 1-2 Werktagen bei Ihnen.</p>
          <div class="card">
            <div class="row"><span class="k">Bank</span><span class="v">${d.bankName}</span></div>
            <div class="row"><span class="k">Anlagebetrag</span><span class="v">${d.amount}</span></div>
            <div class="row"><span class="k">Laufzeit</span><span class="v">${d.termMonths}</span></div>
            <div class="row"><span class="k">Zinssatz</span><span class="v">${d.interestRate}</span></div>
            <div class="row"><span class="k">Eingang</span><span class="v">${d.appCreatedAt}</span></div>
          </div>
        </div>
        ${renderFooter()}
      </div>
    </body></html>`,
  };
};

const adminTemplate = (payload: Record<string, unknown>, applicationId: string) => {
  const d = extractTemplateData(payload);
  return {
    subject: `Neue Festgeldanfrage: ${d.fullName} · ${d.amount}`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${emailStyles}</style></head><body>
      <div class="wrap">
        ${renderHeader('Neue Anfrage im System')}
        <div class="body">
          <h1>Neue Festgeldanfrage</h1>
          <p>Eine neue Anfrage wurde ueber das /apply-Formular eingereicht.</p>
          <div class="card">
            <div class="row"><span class="k">Antrags-ID</span><span class="v">${applicationId}</span></div>
            <div class="row"><span class="k">Name</span><span class="v">${d.fullName}</span></div>
            <div class="row"><span class="k">E-Mail</span><span class="v">${d.customerEmail || '-'}</span></div>
            <div class="row"><span class="k">Telefon</span><span class="v">${d.phone || '-'}</span></div>
            <div class="row"><span class="k">Bank</span><span class="v">${d.bankName}</span></div>
            <div class="row"><span class="k">Anlagebetrag</span><span class="v">${d.amount}</span></div>
            <div class="row"><span class="k">Laufzeit</span><span class="v">${d.termMonths}</span></div>
            <div class="row"><span class="k">Steuer-ID</span><span class="v">${d.taxId}</span></div>
            <div class="row"><span class="k">Eingang</span><span class="v">${d.appCreatedAt}</span></div>
          </div>
        </div>
        ${renderFooter()}
      </div>
    </body></html>`,
  };
};

const computeBackoffMinutes = (attemptCount: number) => {
  if (attemptCount <= 1) return 5;
  if (attemptCount === 2) return 15;
  if (attemptCount === 3) return 60;
  return 180;
};

const sendViaResend = async (to: string, subject: string, html: string, apiKey: string, sender: string) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: sender,
      to: [to],
      subject,
      html,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${text}`);
  }
  return JSON.parse(text || '{}');
};

const createOutboxIfMissing = async (adminClient: ReturnType<typeof createClient>, applicationId: string, adminRecipientEmail: string) => {
  const { data: app, error: appErr } = await adminClient
    .from('applications')
    .select('id, personal_data, investment_data, created_at')
    .eq('id', applicationId)
    .maybeSingle();
  if (appErr) throw appErr;
  if (!app) throw new Error('Application not found');

  const customerEmail = String((app.personal_data as Record<string, unknown>)?.email || '').trim();
  const commonPayload = {
    personal_data: app.personal_data,
    investment_data: app.investment_data,
    created_at: app.created_at,
  };

  const rows: Array<Record<string, unknown>> = [];
  if (customerEmail) {
    rows.push({
      application_id: app.id,
      recipient_type: 'customer',
      to_email: customerEmail,
      payload: commonPayload,
    });
  }
  if (adminRecipientEmail) {
    rows.push({
      application_id: app.id,
      recipient_type: 'admin',
      to_email: adminRecipientEmail,
      payload: commonPayload,
    });
  }

  for (const row of rows) {
    const { error } = await adminClient
      .from('application_email_outbox')
      .upsert(row, { onConflict: 'application_id,recipient_type', ignoreDuplicates: false });
    if (error) throw error;
  }
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
    const SENDER_EMAIL = resolveResendFrom(Deno.env.get('SENDER_EMAIL'));
    const ADMIN_NOTIFY_EMAIL = Deno.env.get('APPLICATION_ADMIN_EMAIL') || Deno.env.get('SENDER_EMAIL') || '';
    const ADMIN_FUNCTION_SECRET = Deno.env.get('ADMIN_FUNCTION_SECRET') || '';

    if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing required env vars' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload = await req.json().catch(() => ({} as Record<string, unknown>));
    const mode = String(payload.mode || 'application');
    const applicationId = payload.application_id ? String(payload.application_id) : null;
    const limit = Math.max(1, Math.min(50, Number(payload.limit || 20)));

    if (mode === 'application' && !applicationId) {
      return new Response(JSON.stringify({ error: 'application_id is required for mode=application' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'retry_due') {
      const headerSecret = req.headers.get('x-admin-secret') || '';
      const headerApiKey = req.headers.get('apikey') || '';
      const authHeader = req.headers.get('authorization') || '';
      const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
      const internalAllowed =
        (ADMIN_FUNCTION_SECRET && headerSecret === ADMIN_FUNCTION_SECRET) ||
        headerApiKey === SERVICE_KEY ||
        bearerToken === SERVICE_KEY;
      if (!internalAllowed) {
        return new Response(JSON.stringify({ error: 'Admin authorization required for retry mode' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (applicationId) {
      await createOutboxIfMissing(adminClient, applicationId, ADMIN_NOTIFY_EMAIL);
    }

    let query = adminClient
      .from('application_email_outbox')
      .select('id, application_id, recipient_type, to_email, payload, attempt_count, max_attempts')
      .in('status', ['pending', 'failed'])
      .lte('next_retry_at', new Date().toISOString())
      .lt('attempt_count', 5)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (applicationId) {
      query = query.eq('application_id', applicationId);
    }

    const { data: rows, error: qErr } = await query;
    if (qErr) throw qErr;
    const outboxRows = (rows || []) as OutboxRow[];

    const results: Array<Record<string, unknown>> = [];
    for (const row of outboxRows) {
      const nextAttempt = Number(row.attempt_count || 0) + 1;

      const { error: lockErr } = await adminClient
        .from('application_email_outbox')
        .update({
          status: 'processing',
          attempt_count: nextAttempt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .in('status', ['pending', 'failed']);
      if (lockErr) {
        results.push({ outbox_id: row.id, ok: false, error: lockErr.message, skipped: true });
        continue;
      }

      try {
        const tpl =
          row.recipient_type === 'admin'
            ? adminTemplate(row.payload || {}, row.application_id)
            : customerTemplate(row.payload || {});

        const resend = await sendViaResend(
          row.to_email,
          tpl.subject,
          tpl.html,
          RESEND_API_KEY,
          SENDER_EMAIL,
        );

        await adminClient
          .from('application_email_outbox')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            last_error: null,
            last_resend_id: resend?.id || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);

        await adminClient.from('application_email_logs').insert({
          outbox_id: row.id,
          application_id: row.application_id,
          recipient_type: row.recipient_type,
          attempt_no: nextAttempt,
          success: true,
          resend_id: resend?.id || null,
          response_body: JSON.stringify(resend || {}),
        });

        results.push({ outbox_id: row.id, ok: true, resend_id: resend?.id || null });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const retryInMin = computeBackoffMinutes(nextAttempt);
        const nextRetry = new Date(Date.now() + retryInMin * 60 * 1000).toISOString();

        const markFailed = {
          status: nextAttempt >= Number(row.max_attempts || 5) ? 'failed' : 'failed',
          last_error: message,
          next_retry_at: nextRetry,
          updated_at: new Date().toISOString(),
        };
        await adminClient.from('application_email_outbox').update(markFailed).eq('id', row.id);

        await adminClient.from('application_email_logs').insert({
          outbox_id: row.id,
          application_id: row.application_id,
          recipient_type: row.recipient_type,
          attempt_no: nextAttempt,
          success: false,
          error_message: message,
        });

        results.push({ outbox_id: row.id, ok: false, error: message, retry_at: nextRetry });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        processed: results.length,
        sent: results.filter((r) => r.ok).length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
