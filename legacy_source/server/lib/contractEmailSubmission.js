const { randomUUID } = require('crypto');
const { resolveResendFrom } = require('./resendSender');
const { getSupabaseAdmin } = require('./supabaseAdmin');
const { fetchSitePdfs, getSiteOrigin } = require('./fetchSitePdfBase64');
const { sendJson } = require('./vercelHttp');

const DEFAULT_ADMIN_EMAIL = 'kundenservice@kapitalmitte.com';
const STORAGE_BUCKET = 'contract-submissions';

/** Contract-form admin copies always go to kundenservice (not ADMIN_EMAIL dev overrides). */
function resolveAdminEmail() {
  return DEFAULT_ADMIN_EMAIL;
}

function buildAttachments(contractFilename, pdfBase64, additionalPdfs) {
  return [
    {
      filename: contractFilename,
      content: pdfBase64,
    },
    ...(additionalPdfs || []).filter((a) => a?.filename && a?.content),
  ];
}

function buildPdfLinksHtml(staticPdfs) {
  const links = (staticPdfs || []).filter((a) => a?.downloadUrl && a?.filename);
  if (!links.length) return '';
  const items = links
    .map(
      (a) =>
        `<li style="margin-bottom:6px;"><a href="${a.downloadUrl}" style="color:#0A2540;">${a.filename}</a> (Download)</li>`,
    )
    .join('');
  return `
    <div style="margin-top:20px;padding:14px 16px;background:#F7FAFE;border:1px solid #DCE3EC;">
      <p style="font-size:13px;color:#0A2540;margin:0 0 8px;font-weight:600;">Weitere Produktunterlagen (Download):</p>
      <ul style="font-size:13px;color:#4a5568;padding-left:18px;margin:0;">${items}</ul>
    </div>`;
}

function buildStaticPdfLinkEntries(config) {
  const origin = getSiteOrigin();
  return (config.staticPdfLinks || []).map(({ url, filename }) => ({
    filename,
    content: null,
    downloadUrl: url.startsWith('http') ? url : `${origin}${url.startsWith('/') ? '' : '/'}${url}`,
  }));
}

async function archiveSubmissionToDashboard(admin, {
  submissionId,
  config,
  pdfBase64,
  staticPdfs,
  safeName,
  customerEmail,
  formSummary,
}) {
  await persistSubmission(admin, {
    id: submissionId,
    product_key: config.productKey,
    bank_name: config.bankName,
    customer_name: safeName,
    customer_email: customerEmail,
    form_summary: formSummary && typeof formSummary === 'object' ? formSummary : {},
    contract_pdf_path: null,
    attachments: [],
    customer_resend_id: null,
    admin_resend_id: null,
    customer_email_sent: false,
    admin_email_sent: false,
    admin_email_error: null,
    status: 'new',
  });

  const contractPdfPath = await uploadPdf(admin, submissionId, 'contract.pdf', pdfBase64);
  const attachmentRecords = [];
  for (const extra of staticPdfs) {
    if (!extra?.content || !extra?.filename) continue;
    const safeFn = extra.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = await uploadPdf(admin, submissionId, `attachments/${safeFn}`, extra.content);
    attachmentRecords.push({ filename: extra.filename, storage_path: storagePath, kind: 'attachment' });
  }

  await updateSubmissionRecord(admin, submissionId, {
    contract_pdf_path: contractPdfPath,
    attachments: attachmentRecords,
  });

  return { savedToDashboard: true };
}

async function uploadPdf(admin, submissionId, relativePath, base64) {
  const buffer = Buffer.from(base64, 'base64');
  const storagePath = `${submissionId}/${relativePath}`;
  const { error } = await admin.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) {
    throw new Error(`PDF-Speicherung fehlgeschlagen (${relativePath}): ${error.message}`);
  }
  return storagePath;
}

async function persistSubmission(admin, payload) {
  const { error } = await admin.from('contract_form_submissions').insert(payload);
  if (error) {
    console.error('[contract-submission] db insert failed:', error.message, error.details);
    throw new Error(`Datenbankfehler: ${error.message}`);
  }
}

async function updateSubmissionRecord(admin, id, patch) {
  const { error } = await admin.from('contract_form_submissions').update(patch).eq('id', id);
  if (error) {
    console.error('[contract-submission] db update failed:', error.message);
    throw new Error(`Datenbank-Update fehlgeschlagen: ${error.message}`);
  }
}

async function sendResendEmail({ apiKey, fromEmail, to, bcc, subject, html, attachments }) {
  const body = {
    from: fromEmail,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    attachments,
  };
  if (bcc?.length) body.bcc = bcc;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    console.error('[contract-submission] Resend error:', data);
    throw new Error(data?.message || 'Email send failed');
  }
  return data;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').IncomingMessage} res
 * @param {{
 *   productKey: string,
 *   bankName: string,
 *   contractFilename: (name: string) => string,
 *   adminSubject: (name: string, date: string) => string,
 *   adminTitle: string,
 *   staticPdfs?: { url: string, filename: string }[],
 *   staticPdfLinks?: { url: string, filename: string }[],
 * }} config
 */
async function processContractEmailSubmission(req, res, config) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const {
    customerEmail,
    customerName,
    pdfBase64,
    formSummaryHtml,
    formSummary,
    signatureAttachments,
  } = req.body || {};

  if (!customerEmail || !pdfBase64) {
    return sendJson(res, 400, { error: 'Missing required fields: customerEmail, pdfBase64' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = resolveResendFrom(process.env.SENDER_EMAIL);
  const adminEmail = resolveAdminEmail();

  if (!apiKey) {
    console.error('RESEND_API_KEY is not set');
    return sendJson(res, 500, { error: 'Email service not configured' });
  }

  const safeName = customerName || 'Kunde';
  const today = new Date().toLocaleDateString('de-DE');
  const submissionId = randomUUID();
  const contractFilename = config.contractFilename(safeName);
  const admin = getSupabaseAdmin();

  let staticPdfs = buildStaticPdfLinkEntries(config);
  try {
    if (config.staticPdfs?.length) {
      staticPdfs = [...staticPdfs, ...(await fetchSitePdfs(config.staticPdfs))];
    }
  } catch (fetchErr) {
    console.error('[contract-submission] static PDF fetch failed:', fetchErr.message);
  }

  const attachments = buildAttachments(contractFilename, pdfBase64, staticPdfs);
  const adminSignatureAttachments = (signatureAttachments || []).filter((a) => a?.filename && a?.content);
  const adminAttachments = [...attachments, ...adminSignatureAttachments];
  const pdfLinksHtml = buildPdfLinksHtml(staticPdfs);

  const adminHtml = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0B1F33;">
      <div style="background-color: #0A2540; padding: 24px;">
        <h1 style="color: #fff; font-size: 18px; margin: 0;">${config.adminTitle}</h1>
      </div>
      <div style="padding: 24px; background: #fff;">
        <p style="font-size: 14px;"><strong>Kunde:</strong> ${safeName}</p>
        <p style="font-size: 14px;"><strong>E-Mail:</strong> ${customerEmail}</p>
        <p style="font-size: 14px;"><strong>Produkt:</strong> ${config.bankName} — ${config.productKey}</p>
        <p style="font-size: 14px;"><strong>Datum:</strong> ${today}</p>
        ${formSummaryHtml ? `<div style="margin-top: 16px; padding: 16px; background: #F7FAFE; border: 1px solid #DCE3EC;">${formSummaryHtml}</div>` : ''}
        ${pdfLinksHtml}
        <p style="font-size: 13px; color: #6B7C93; margin-top: 24px;">
          Der ausgefüllte Vertrag ist als PDF angehängt (große Produkt-PDFs ggf. als Download-Link).
          ${adminSignatureAttachments.length ? `Die Kundenunterschrift(en) sind zusätzlich als Bilddatei(en) angehängt (${adminSignatureAttachments.map((a) => a.filename).join(', ')}).` : 'Die Kundenunterschrift(en) sind im Vertrags-PDF enthalten.'}
          Alle Dokumente finden Sie auch im Admin-Bereich unter „Vertrags-Einreichungen“.
        </p>
      </div>
    </div>
  `;

  let savedToDashboard = false;
  let archiveError = null;

  const archivePromise = admin
    ? archiveSubmissionToDashboard(admin, {
        submissionId,
        config,
        pdfBase64,
        staticPdfs,
        safeName,
        customerEmail,
        formSummary,
      })
        .then(() => ({ savedToDashboard: true, archiveError: null }))
        .catch((persistErr) => {
          const message = persistErr.message || 'Speichern im Admin-Bereich fehlgeschlagen';
          console.error('[contract-submission] archive failed:', message);
          return { savedToDashboard: false, archiveError: message };
        })
    : Promise.resolve({
        savedToDashboard: false,
        archiveError: 'SUPABASE_SERVICE_ROLE_KEY fehlt — Admin-Archiv nicht verfügbar',
      });

  if (!admin) {
    console.error('[contract-submission] Supabase admin client missing');
  }

  try {
    const [archiveResult, adminResult] = await Promise.all([
      archivePromise,
      sendResendEmail({
        apiKey,
        fromEmail,
        to: adminEmail,
        subject: config.adminSubject(safeName, today),
        html: adminHtml,
        attachments: adminAttachments,
      }),
    ]);

    savedToDashboard = archiveResult.savedToDashboard;
    archiveError = archiveResult.archiveError;

    if (admin && savedToDashboard) {
      try {
        await updateSubmissionRecord(admin, submissionId, {
          admin_resend_id: adminResult.id,
          admin_email_sent: true,
          admin_email_error: null,
        });
      } catch (updateErr) {
        console.error('[contract-submission] failed to record email success:', updateErr.message);
      }
    }

    return sendJson(res, 200, {
      success: true,
      submissionId: savedToDashboard ? submissionId : null,
      savedToDashboard,
      adminEmailId: adminResult.id,
      adminEmailSent: true,
      adminNotifyEmail: adminEmail,
      ...(archiveError ? { archiveWarning: archiveError } : {}),
    });
  } catch (error) {
    console.error('[contract-submission] admin email failed:', error);

    const archiveResult = await archivePromise.catch(() => ({
      savedToDashboard: false,
      archiveError: archiveError || null,
    }));
    savedToDashboard = archiveResult.savedToDashboard;
    archiveError = archiveResult.archiveError ?? archiveError;

    if (admin && savedToDashboard) {
      try {
        await updateSubmissionRecord(admin, submissionId, {
          admin_email_sent: false,
          admin_email_error: error.message || 'Email send failed',
        });
      } catch (updateErr) {
        console.error('[contract-submission] failed to record email error:', updateErr.message);
      }
    }

    return sendJson(res, 500, {
      error: error.message || 'Internal server error',
      savedToDashboard,
      submissionId: savedToDashboard ? submissionId : null,
      ...(archiveError ? { archiveWarning: archiveError } : {}),
    });
  }
}

module.exports = {
  processContractEmailSubmission,
  DEFAULT_ADMIN_EMAIL,
  resolveAdminEmail,
};
