const { getSupabaseAdmin } = require('../server/lib/supabaseAdmin');
const { sendProductInquiryAdminEmail } = require('../server/lib/sendResendEmail');
const { withApiHandler, sendJson } = require('../server/lib/vercelHttp');

const PRODUCTS = new Set(['aktien', 'anleihen', 'spargeld']);

module.exports = withApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = req.body || {};
  const product = String(body.product || '').trim();
  const first_name = String(body.first_name || '').trim();
  const last_name = String(body.last_name || '').trim();
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();

  if (!PRODUCTS.has(product)) {
    return sendJson(res, 400, { error: 'Invalid product' });
  }
  if (!first_name || !last_name || !email || !phone) {
    return sendJson(res, 400, { error: 'Missing required fields' });
  }
  if (!body.consent_privacy || !body.consent_terms) {
    return sendJson(res, 400, { error: 'Consent required' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return sendJson(res, 500, { error: 'Database not configured' });
  }

  const row = {
    product,
    answers: body.answers && typeof body.answers === 'object' ? body.answers : {},
    first_name,
    last_name,
    email,
    phone,
    customer_number: body.customer_number ? String(body.customer_number).trim() : null,
    consent_privacy: true,
    consent_terms: true,
    consent_marketing: Boolean(body.consent_marketing),
    user_id: null,
  };

  const { data, error } = await admin
    .from('product_inquiry_leads')
    .insert(row)
    .select('id')
    .single();

  if (error) {
    console.error('[submit-product-inquiry-lead] insert', error);
    return sendJson(res, 500, { error: 'Failed to save inquiry', code: error.code });
  }

  const emailResult = await sendProductInquiryAdminEmail(row, data?.id ?? null);

  return sendJson(res, 200, {
    success: true,
    id: data?.id ?? null,
    emailSent: emailResult.ok,
    ...(emailResult.ok ? {} : { emailError: emailResult.error }),
  });
});
