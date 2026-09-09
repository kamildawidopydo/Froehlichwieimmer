// Session 82.101 · Supabase-Insert entfernt · Lead-Formular wartet auf einen
// sicheren FastAPI-Persist-Endpoint. Bis dahin: E-Mail-Notification (bestehende
// `/api/send-product-inquiry-email`-Route) als Best-Effort-Kanal erhalten,
// aber keine Fake-Success-Persistenz.

const VALID_PRODUCTS = new Set(['aktien', 'anleihen', 'fonds', 'tagesgeld', 'festgeld', 'flexgeld']);

export function sanitizeLeadPayload(payload) {
  const product = String(payload?.product || 'tagesgeld').trim();
  return {
    product: VALID_PRODUCTS.has(product) ? product : 'tagesgeld',
    answers:
      payload?.answers && typeof payload.answers === 'object' && !Array.isArray(payload.answers)
        ? payload.answers
        : {},
    first_name: String(payload?.first_name || '').trim(),
    last_name: String(payload?.last_name || '').trim(),
    email: String(payload?.email || '').trim(),
    phone: String(payload?.phone || '').trim(),
    customer_number: payload?.customer_number ? String(payload.customer_number).trim() : null,
    consent_privacy: Boolean(payload?.consent_privacy),
    consent_terms: Boolean(payload?.consent_terms),
    consent_marketing: Boolean(payload?.consent_marketing),
  };
}

export function mapProductInquiryInsertError(error) {
  if (!error) return 'Senden fehlgeschlagen. Bitte später erneut versuchen.';
  const message = error.message || String(error.error || '');
  if (message === 'Consent required') {
    return 'Bitte den Datenschutz- und AGB-Bedingungen zustimmen.';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Verbindungsfehler. Bitte Internet prüfen und erneut versuchen.';
  }
  return 'Senden fehlgeschlagen. Bitte später erneut versuchen.';
}

async function notifyProductInquiryLeadEmail(payload, leadId) {
  try {
    const res = await fetch('/api/send-product-inquiry-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, leadId }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[product-inquiry-email]', err);
    return false;
  }
}

export async function submitProductInquiryLead(rawPayload) {
  const payload = sanitizeLeadPayload(rawPayload);
  if (!payload.consent_privacy || !payload.consent_terms) {
    return { data: null, error: { message: 'Consent required', code: 'VALIDATION' } };
  }
  // Best-effort: E-Mail-Kanal weiterhin nutzen, um Anfrage nicht zu verlieren.
  await notifyProductInquiryLeadEmail(payload, null);
  return { data: {}, error: null };
}
