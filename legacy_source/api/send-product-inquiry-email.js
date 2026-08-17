const { sendProductInquiryAdminEmail } = require('../server/lib/sendResendEmail');
const { withApiHandler, sendJson } = require('../server/lib/vercelHttp');

module.exports = withApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = req.body || {};
  const first_name = String(body.first_name || '').trim();
  const last_name = String(body.last_name || '').trim();
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const product = String(body.product || '').trim();

  if (!first_name || !last_name || !email || !phone || !product) {
    return sendJson(res, 400, { error: 'Missing required fields' });
  }

  const emailResult = await sendProductInquiryAdminEmail(
    {
      product,
      first_name,
      last_name,
      email,
      phone,
      customer_number: body.customer_number,
      answers: body.answers,
      consent_marketing: Boolean(body.consent_marketing),
    },
    body.leadId,
  );

  if (!emailResult.ok) {
    return sendJson(res, 500, { error: emailResult.error || 'Failed to send email' });
  }

  return sendJson(res, 200, { success: true, id: emailResult.id });
});
