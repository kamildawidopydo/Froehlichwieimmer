import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
  if (!isSupabaseConfigured) {
    return 'Der Server ist nicht konfiguriert. Bitte kontaktieren Sie uns direkt.';
  }
  if (!error) return 'Senden fehlgeschlagen. Bitte später erneut versuchen.';

  const code = error.code;
  const message = error.message || String(error.error || '');
  const devHint =
    process.env.NODE_ENV === 'development' && message
      ? ` (${message}${code ? ` · ${code}` : ''})`
      : '';

  if (code === '42501') {
    return `Anfrage konnte nicht gespeichert werden. Bitte Seite neu laden und erneut versuchen.${devHint}`;
  }
  if (code === 'PGRST301' || /jwt|session/i.test(message)) {
    return `Ihre Sitzung ist abgelaufen. Bitte Seite neu laden und erneut versuchen.${devHint}`;
  }
  if (code === '23503' || code === '23514') {
    return `Anfrage konnte nicht gespeichert werden. Bitte Eingaben prüfen und erneut versuchen.${devHint}`;
  }
  if (code === '42P01' || message.includes('product_inquiry_leads')) {
    return 'Das Anfrage-Formular ist derzeit nicht verfügbar. Bitte kontaktieren Sie uns direkt.';
  }
  if (message.includes('Database not configured') || message.includes('not configured')) {
    return 'Der Server ist vorübergehend nicht erreichbar. Bitte kontaktieren Sie uns unter kundenservice@kapital-direkt24.de.';
  }
  if (/API 404|API 502|API 503/i.test(message)) {
    return 'Formular-Server nicht erreichbar. Bitte „npm run dev“ verwenden (Web + API).';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Verbindungsfehler. Bitte Internet prüfen und erneut versuchen.';
  }

  return `Senden fehlgeschlagen. Bitte später erneut versuchen.${devHint}`;
}

async function notifyProductInquiryLeadEmail(payload, leadId) {
  try {
    const res = await fetch('/api/send-product-inquiry-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, leadId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[product-inquiry-email]', body?.error || res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[product-inquiry-email]', err);
    return false;
  }
}

/** Browser insert — explicit columns only, never RETURNING (RLS). */
async function submitProductInquiryLeadDirect(payload) {
  if (!payload.consent_privacy || !payload.consent_terms) {
    return {
      data: null,
      error: { message: 'Consent required', code: 'VALIDATION' },
    };
  }

  const row = {
    product: payload.product,
    answers: payload.answers,
    first_name: payload.first_name,
    last_name: payload.last_name,
    email: payload.email,
    phone: payload.phone,
    customer_number: payload.customer_number,
    consent_privacy: true,
    consent_terms: true,
    consent_marketing: payload.consent_marketing,
    user_id: null,
  };

  // No .select() → Prefer: return=minimal (avoids RLS SELECT requirement).
  const { error } = await supabase.from('product_inquiry_leads').insert(row);

  if (!error) {
    notifyProductInquiryLeadEmail(payload, null);
  }

  return { data: error ? null : {}, error };
}

/**
 * Supabase ist der aktive Persistenz-Layer.
 * Der frühere Vorlauf-Call auf /api/submit-product-inquiry-lead (Session-64: 404 im
 * FastAPI-Backend, kein Node-Worker mehr aktiv) wurde entfernt, um unnötige 404-Requests
 * zu vermeiden. Der direkte Supabase-Insert läuft mit anon-key + RLS + CHECK-Constraint.
 */
export async function submitProductInquiryLead(rawPayload) {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: { message: 'not configured', code: 'CONFIG' },
    };
  }

  const payload = sanitizeLeadPayload(rawPayload);
  return submitProductInquiryLeadDirect(payload);
}
