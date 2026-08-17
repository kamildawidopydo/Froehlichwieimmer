const { randomUUID } = require('crypto');
const { resolveResendFrom } = require('./resendSender');
const { getSupabaseAdmin } = require('./supabaseAdmin');
const { wrapEmail, renderCardRow, escapeHtml } = require('./brandedEmailLayout');
const { sendJson } = require('./vercelHttp');

const DEFAULT_ADMIN_EMAIL = 'kundenservice@kapitalmitte.com';
const STORAGE_BUCKET = 'document-uploads';
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 10;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx']);

/** Document-upload admin copies always go to kundenservice (not ADMIN_EMAIL dev overrides). */
function resolveAdminEmail() {
  return DEFAULT_ADMIN_EMAIL;
}

function sanitizeFilename(name) {
  const base = String(name || 'document')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120);
  return base || 'document';
}

function extFromName(name) {
  const parts = String(name || '').toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function validateFile(file) {
  if (!file?.name || !file?.base64) {
    return 'Jede Datei benötigt Name und Inhalt';
  }
  const ext = extFromName(file.name);
  if (!ALLOWED_EXT.has(ext)) {
    return `Dateityp nicht erlaubt: ${file.name}`;
  }
  const mime = String(file.type || '').toLowerCase();
  if (mime && !ALLOWED_MIME.has(mime)) {
    return `MIME-Typ nicht erlaubt: ${file.name}`;
  }
  let buffer;
  try {
    buffer = Buffer.from(file.base64, 'base64');
  } catch {
    return `Ungültige Datei: ${file.name}`;
  }
  if (!buffer.length) {
    return `Leere Datei: ${file.name}`;
  }
  return { buffer, ext, mime: mime || 'application/octet-stream' };
}

function resolveClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim().slice(0, 64);
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).trim().slice(0, 64);
  }
  return req.socket?.remoteAddress?.slice(0, 64) || null;
}

async function uploadFile(admin, submissionId, index, filename, buffer, contentType) {
  const safeName = sanitizeFilename(filename);
  const storagePath = `${submissionId}/${index}_${safeName}`;
  const { error } = await admin.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Speichern fehlgeschlagen (${filename}): ${error.message}`);
  }
  return { path: storagePath, name: filename, size: buffer.length, type: contentType };
}

async function sendResendEmail({ apiKey, fromEmail, to, subject, html, attachments }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      attachments,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    console.error('[document-upload] Resend error:', data);
    throw new Error(data?.message || 'E-Mail-Versand fehlgeschlagen');
  }
  return data;
}

function buildAdminEmailHtml({ name, message, fileNames, userAgent, ip, submittedAt }) {
  const rows = [
    renderCardRow('Name', escapeHtml(name)),
    renderCardRow('Zeitpunkt', escapeHtml(submittedAt)),
    renderCardRow('Dateien', escapeHtml(fileNames.join(', ') || '—')),
    renderCardRow('Gerät / Browser', escapeHtml(userAgent || '—')),
    renderCardRow('IP', escapeHtml(ip || '—')),
  ];
  if (message) {
    rows.push(renderCardRow('Nachricht', escapeHtml(message)));
  }
  return wrapEmail(
    'Dokument-Upload',
    `
      <h1>Neuer Dokument-Upload</h1>
      <p>Ein Kunde hat Dokumente über den sicheren Upload-Bereich eingereicht.</p>
      <div class="card">${rows.join('')}</div>
    `,
  );
}

async function processDocumentUpload(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = req.body || {};
  const code = String(body.code || '').trim();
  const name = String(body.name || '').trim();
  const message = body.message ? String(body.message).trim().slice(0, 4000) : null;
  const files = Array.isArray(body.files) ? body.files : [];

  if (!code) {
    return sendJson(res, 400, { error: 'Zugangscode erforderlich' });
  }
  if (!name) {
    return sendJson(res, 400, { error: 'Name erforderlich' });
  }
  if (!files.length) {
    return sendJson(res, 400, { error: 'Mindestens eine Datei erforderlich' });
  }
  if (files.length > MAX_FILES) {
    return sendJson(res, 400, { error: `Maximal ${MAX_FILES} Dateien erlaubt` });
  }

  const parsedFiles = [];
  let totalBytes = 0;
  for (const file of files) {
    const result = validateFile(file);
    if (typeof result === 'string') {
      return sendJson(res, 400, { error: result });
    }
    totalBytes += result.buffer.length;
    if (totalBytes > MAX_TOTAL_BYTES) {
      return sendJson(res, 400, { error: 'Gesamtgröße darf 20 MB nicht überschreiten' });
    }
    parsedFiles.push({ ...result, name: file.name });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return sendJson(res, 500, { error: 'Server nicht konfiguriert' });
  }

  const userAgent =
    typeof body.userAgent === 'string'
      ? body.userAgent.slice(0, 512)
      : req.headers?.['user-agent']?.slice(0, 512) || null;
  const ip = resolveClientIp(req);

  const { data: codeId, error: consumeError } = await admin.rpc('consume_document_access_code', {
    p_code: code,
    p_used_by_name: name,
    p_user_agent: userAgent,
    p_ip: ip,
  });

  if (consumeError || !codeId) {
    const msg = consumeError?.message?.includes('Ungültig')
      ? 'Ungültiger oder bereits verwendeter Zugangscode'
      : consumeError?.message || 'Zugangscode ungültig';
    return sendJson(res, 403, { error: msg });
  }

  const submissionId = randomUUID();
  const storedFiles = [];

  try {
    for (let i = 0; i < parsedFiles.length; i += 1) {
      const f = parsedFiles[i];
      const meta = await uploadFile(admin, submissionId, i, f.name, f.buffer, f.mime);
      storedFiles.push(meta);
    }
  } catch (uploadErr) {
    console.error('[document-upload] upload failed:', uploadErr);
    return sendJson(res, 500, { error: uploadErr.message || 'Upload fehlgeschlagen' });
  }

  const submissionRow = {
    id: submissionId,
    code_id: codeId,
    used_by_name: name,
    message,
    files: storedFiles,
    user_agent: userAgent,
    ip,
    status: 'new',
    admin_email_sent: false,
  };

  const { error: insertError } = await admin.from('document_upload_submissions').insert(submissionRow);
  if (insertError) {
    console.error('[document-upload] db insert failed:', insertError);
    return sendJson(res, 500, { error: 'Speichern fehlgeschlagen' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = resolveResendFrom(process.env.SENDER_EMAIL);
  const toEmail = resolveAdminEmail();
  const submittedAt = new Date().toLocaleString('de-DE');
  const attachments = parsedFiles.map((f) => ({
    filename: sanitizeFilename(f.name),
    content: f.buffer.toString('base64'),
  }));

  let emailSent = false;
  let emailError = null;
  let resendId = null;

  if (!apiKey) {
    emailError = 'RESEND_API_KEY nicht konfiguriert';
  } else {
    try {
      const emailData = await sendResendEmail({
        apiKey,
        fromEmail,
        to: toEmail,
        subject: `Dokument-Upload: ${name}`,
        html: buildAdminEmailHtml({
          name,
          message,
          fileNames: parsedFiles.map((f) => f.name),
          userAgent,
          ip,
          submittedAt,
        }),
        attachments,
      });
      emailSent = true;
      resendId = emailData?.id || null;
    } catch (err) {
      emailError = err.message;
      console.error('[document-upload] email failed:', err);
    }
  }

  await admin
    .from('document_upload_submissions')
    .update({
      admin_email_sent: emailSent,
      admin_email_error: emailError,
      admin_resend_id: resendId,
    })
    .eq('id', submissionId);

  if (!emailSent) {
    return sendJson(res, 200, {
      success: true,
      id: submissionId,
      emailSent: false,
      warning: emailError || 'E-Mail konnte nicht gesendet werden',
    });
  }

  return sendJson(res, 200, { success: true, id: submissionId, emailSent: true });
}

module.exports = { processDocumentUpload, STORAGE_BUCKET };
