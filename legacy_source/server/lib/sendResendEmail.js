const { resolveResendFrom } = require('./resendSender');

/** Product inquiry notifications always go to customer service inbox. */
const PRODUCT_INQUIRY_ADMIN_EMAIL = 'kundenservice@kapitalmitte.com';

async function sendViaResend({ apiKey, from, to, subject, html, replyTo }) {
  const payload = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  };
  if (replyTo) payload.reply_to = replyTo;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data?.message || 'Email send failed');
    err.status = response.status;
    err.resend = data;
    throw err;
  }
  return data;
}

/**
 * @returns {{ ok: true, id: string } | { ok: false, error: string }}
 */
async function sendProductInquiryAdminEmail(payload, leadId) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }

  const { buildAdminProductInquiryEmail } = require('./productInquiryEmails');
  const fromEmail = resolveResendFrom(process.env.SENDER_EMAIL);
  const tpl = buildAdminProductInquiryEmail({ ...payload, leadId });

  try {
    const result = await sendViaResend({
      apiKey,
      from: fromEmail,
      to: PRODUCT_INQUIRY_ADMIN_EMAIL,
      subject: tpl.subject,
      html: tpl.html,
      replyTo: tpl.replyTo,
    });
    return { ok: true, id: result.id };
  } catch (err) {
    console.error('[sendProductInquiryAdminEmail]', err.message, err.resend || '');
    return { ok: false, error: err.message || 'Email send failed' };
  }
}

module.exports = {
  PRODUCT_INQUIRY_ADMIN_EMAIL,
  sendViaResend,
  sendProductInquiryAdminEmail,
};
