// Supabase Edge Function: send-email
// Triggered by DB webhooks (pg_net) on profile insert/update and callable from admin UI.
//
// Deploy:
//   supabase functions deploy send-email --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { resolveResendFrom } from '../_shared/resendSender.ts';
import {
  BRAND,
  COLORS,
  SUPPORT_EMAIL,
  escapeHtml,
  renderBadge,
  renderButton,
  renderCard,
  renderCardRow,
  renderNote,
  wrapEmail,
} from '../_shared/brandedEmailLayout.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const APP_URL = () => Deno.env.get('APP_URL') || 'https://www.kapitalmitte.com';
const LOGIN_URL = () => `${APP_URL().replace(/\/$/, '')}/login`;

type ProfileRecord = {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  country?: string;
  role?: string;
  status?: string;
  rejection_reason?: string;
};

type ProvisionedRecord = ProfileRecord & {
  temporary_password?: string;
};

type WebhookPayload = {
  type?: 'INSERT' | 'UPDATE' | 'provisioned';
  record?: ProvisionedRecord;
  old_record?: { status?: string };
};

const fullName = (r: ProfileRecord) => {
  const name = [r.first_name, r.last_name].filter(Boolean).join(' ').trim();
  return name || 'Kunde';
};

const greetingName = (r: ProfileRecord) => {
  const first = (r.first_name || '').trim();
  return first || fullName(r);
};

const heading = (text: string) =>
  `<p style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:${COLORS.text};line-height:1.3;">${text}</p>`;

const para = (html: string) =>
  `<p style="margin:0 0 14px 0;color:${COLORS.muted};">${html}</p>`;

const approvedTemplate = (record: ProfileRecord) => {
  const name = escapeHtml(greetingName(record));
  const loginUrl = LOGIN_URL();
  const bodyHtml = `
    ${renderBadge('Konto freigeschaltet')}
    ${heading(`Guten Tag ${name},`)}
    ${para(
      `wir freuen uns, Ihnen mitteilen zu können, dass Ihre Registrierung geprüft und <strong style="color:${COLORS.text};">Ihr Konto erfolgreich freigeschaltet</strong> wurde.`,
    )}
    ${para(
      'Ab sofort können Sie sich mit Ihrer E-Mail-Adresse und Ihrem Passwort anmelden und alle Funktionen Ihrer persönlichen Vermögensplattform nutzen.',
    )}
    ${renderCard(
      [
        renderCardRow('E-Mail', escapeHtml(record.email || '–')),
        renderCardRow('Status', 'Freigeschaltet'),
      ].join(''),
    )}
    ${renderButton(loginUrl, 'Jetzt anmelden')}
    ${para(
      'Nach der Anmeldung führt Sie unser kurzer Einrichtungsassistent durch die wichtigsten Schritte, damit Sie schnell starten können.',
    )}
    ${renderNote(
      `Sollten Sie diese Registrierung nicht selbst vorgenommen haben, kontaktieren Sie uns bitte umgehend unter <a href="mailto:${SUPPORT_EMAIL}" style="color:${COLORS.primary};">${SUPPORT_EMAIL}</a>.`,
    )}
  `;

  return {
    subject: `Ihr ${BRAND} Konto wurde freigeschaltet`,
    html: wrapEmail('Willkommen', bodyHtml, {
      preheader: 'Ihr Kapitalmitte Konto wurde freigeschaltet — jetzt anmelden.',
    }),
  };
};

const rejectedTemplate = (record: ProfileRecord) => {
  const name = escapeHtml(greetingName(record));
  const reason = escapeHtml((record.rejection_reason || '').trim());
  const bodyHtml = `
    ${heading(`Guten Tag ${name},`)}
    ${para(
      `vielen Dank für Ihr Interesse an ${BRAND}. Nach sorgfältiger Prüfung Ihrer Angaben können wir Ihre Registrierung leider derzeit nicht freischalten.`,
    )}
    ${reason ? renderNote(`<strong>Hinweis:</strong> ${reason}`) : ''}
    ${para(
      `Wenn Sie der Meinung sind, dass es sich um ein Missverständnis handelt, oder Sie weitere Fragen haben, steht Ihnen unser Kundenservice gerne zur Verfügung: <a href="mailto:${SUPPORT_EMAIL}" style="color:${COLORS.primary};">${SUPPORT_EMAIL}</a>`,
    )}
    ${para('Wir danken Ihnen für Ihr Verständnis.')}
  `;

  return {
    subject: `Information zu Ihrer ${BRAND} Registrierung`,
    html: wrapEmail('Registrierungsstatus', bodyHtml, {
      preheader: 'Information zu Ihrer Kapitalmitte Registrierung.',
    }),
  };
};

const provisionedWelcomeTemplate = (record: ProvisionedRecord) => {
  const name = escapeHtml(greetingName(record));
  const loginUrl = LOGIN_URL();
  const tempPassword = escapeHtml((record.temporary_password || '').trim());
  const bodyHtml = `
    ${renderBadge('Konto freigeschaltet')}
    ${heading(`Guten Tag ${name},`)}
    ${para(
      `für Sie wurde ein Zugang zur ${BRAND} Vermögensplattform eingerichtet. Ihr Konto ist <strong style="color:${COLORS.text};">sofort freigeschaltet</strong>.`,
    )}
    ${para('Bitte melden Sie sich mit den folgenden Zugangsdaten an:')}
    ${renderCard(
      [
        renderCardRow('E-Mail', escapeHtml(record.email || '–')),
        renderCardRow(
          'Temporäres Passwort',
          `<span style="font-family:Consolas,Monaco,monospace;letter-spacing:0.04em;">${tempPassword || '–'}</span>`,
        ),
      ].join(''),
    )}
    ${renderNote(
      'Aus Sicherheitsgründen müssen Sie beim ersten Login ein neues persönliches Passwort festlegen.',
    )}
    ${renderButton(loginUrl, 'Jetzt anmelden')}
    ${para('Bewahren Sie dieses Passwort vertraulich auf. Teilen Sie es nicht mit Dritten.')}
  `;

  return {
    subject: `Ihr ${BRAND} Konto – Zugangsdaten`,
    html: wrapEmail('Willkommen', bodyHtml, {
      preheader: 'Ihre Kapitalmitte Zugangsdaten — bitte Passwort nach dem Login ändern.',
    }),
  };
};

const newRegistrationAdminTemplate = (record: ProfileRecord) => {
  const name = escapeHtml(fullName(record));
  const adminUrl = `${APP_URL().replace(/\/$/, '')}/admin/users`;
  const bodyHtml = `
    ${heading('Neuer Registrierungsantrag')}
    ${para('Ein neuer Benutzer hat sich registriert und wartet auf Freischaltung im Admin-Bereich.')}
    ${renderCard(
      [
        renderCardRow('Name', name),
        renderCardRow('E-Mail', escapeHtml(record.email || '–')),
        renderCardRow('Land', escapeHtml(record.country || '–')),
        renderCardRow('Status', 'Ausstehend'),
      ].join(''),
    )}
    ${renderButton(adminUrl, 'Im Admin-Bereich öffnen')}
  `;

  return {
    subject: `Neue Registrierung: ${fullName(record)}`,
    html: wrapEmail('Neue Kundenregistrierung', bodyHtml, {
      preheader: `${fullName(record)} wartet auf Freischaltung.`,
    }),
  };
};

async function sendViaResend(to: string, subject: string, html: string): Promise<{ id?: string }> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const SENDER_EMAIL = resolveResendFrom(Deno.env.get('SENDER_EMAIL'));
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: SENDER_EMAIL, to: [to], subject, html }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body?.message === 'string' ? body.message : `Resend ${res.status}`);
  }
  return body;
}

function resolveStatusEmail(payload: WebhookPayload): { to: string; subject: string; html: string } | null {
  const record = payload.record || {};
  const email = (record.email || '').trim();
  if (!email) return null;

  if (payload.type === 'provisioned') {
    const tempPassword = (record.temporary_password || '').trim();
    if (!tempPassword) return null;
    const tpl = provisionedWelcomeTemplate(record);
    return { to: email, ...tpl };
  }

  if (payload.type === 'INSERT') {
    if (record.personal_data) return null;
    if (record.role !== 'user' || record.status !== 'pending') return null;
    const adminEmail =
      Deno.env.get('ADMIN_EMAIL') ||
      Deno.env.get('APPLICATION_ADMIN_EMAIL') ||
      SUPPORT_EMAIL;
    const tpl = newRegistrationAdminTemplate(record);
    return { to: adminEmail, ...tpl };
  }

  if (payload.type === 'UPDATE') {
    const newStatus = record.status;
    const oldStatus = payload.old_record?.status;
    if (!newStatus || newStatus === oldStatus) return null;

    if (newStatus === 'approved') {
      const tpl = approvedTemplate(record);
      return { to: email, ...tpl };
    }
    if (newStatus === 'rejected') {
      const tpl = rejectedTemplate(record);
      return { to: email, ...tpl };
    }
  }

  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const payload = (await req.json().catch(() => ({}))) as WebhookPayload;
    const mail = resolveStatusEmail(payload);

    if (!mail) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await sendViaResend(mail.to, mail.subject, mail.html);
    return new Response(JSON.stringify({ success: true, to: mail.to, resend_id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[send-email]', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
