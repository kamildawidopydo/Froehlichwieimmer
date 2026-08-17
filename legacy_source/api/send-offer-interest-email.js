const { resolveResendFrom } = require('../server/lib/resendSender');
const { withApiHandler, sendJson } = require('../server/lib/vercelHttp');
const {
  buildCustomerOfferInterestEmail,
  buildAdminOfferInterestEmail,
} = require('../server/lib/offerInterestEmails');

const ADMIN_EMAIL = 'kundenservice@kapitalmitte.com';

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
    throw new Error(data?.message || 'Email send failed');
  }
  return data;
}

module.exports = withApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const { name, email, phone, message, offer } = req.body || {};
  if (!String(name || '').trim() || !String(email || '').trim() || !offer?.bank_name) {
    return sendJson(res, 400, { error: 'Missing required fields' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set');
    return sendJson(res, 500, { error: 'Email service not configured' });
  }

  const fromEmail = resolveResendFrom(process.env.SENDER_EMAIL);
  const payload = {
    name: String(name).trim(),
    email: String(email).trim(),
    phone: phone || null,
    message: message || null,
    offer,
  };

  try {
    const customerTpl = buildCustomerOfferInterestEmail(payload);
    const adminTpl = buildAdminOfferInterestEmail(payload);

    const [customerResult, adminResult] = await Promise.all([
      sendViaResend({
        apiKey,
        from: fromEmail,
        to: payload.email,
        subject: customerTpl.subject,
        html: customerTpl.html,
      }),
      sendViaResend({
        apiKey,
        from: fromEmail,
        to: ADMIN_EMAIL,
        subject: adminTpl.subject,
        html: adminTpl.html,
        replyTo: payload.email,
      }),
    ]);

    return sendJson(res, 200, {
      success: true,
      customerId: customerResult.id,
      adminId: adminResult.id,
    });
  } catch (error) {
    console.error('[send-offer-interest-email]', error);
    return sendJson(res, 500, {
      error: error?.message || 'Failed to send emails',
    });
  }
});
