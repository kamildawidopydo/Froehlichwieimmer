/** Defaults aligned with /kredit (CreditLeadPage). */
export const CREDIT_CARD_EXAMPLE_AMOUNT = 20_000;
export const CREDIT_CARD_EXAMPLE_TERM_MONTHS = 84;

export function calculateCreditMonthlyRate(principal, annualRatePercent, termMonths) {
  const p = Number(principal || 0);
  const n = Number(termMonths || 0);
  const annualRate = Number(annualRatePercent || 0);
  if (!p || !n || !Number.isFinite(p) || !Number.isFinite(n)) return null;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate <= 0) return p / n;
  const denominator = 1 - (1 + monthlyRate) ** -n;
  if (denominator === 0) return null;
  return (p * monthlyRate) / denominator;
}

export function formatEffectiveRateDe(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(2).replace('.', ',');
}

export function formatCreditTermRange(offer) {
  const min = Number(offer.min_term_months);
  const max = Number(offer.max_term_months);
  if (min && max) return `${min}–${max} Monate`;
  if (max) return `bis ${max} Monate`;
  if (min) return `ab ${min} Monaten`;
  return 'Flexible Laufzeit';
}

export function formatCreditAmountRange(offer) {
  const min = Number(offer.min_amount_eur);
  const max = Number(offer.max_amount_eur);
  if (min && max) {
    return `${min.toLocaleString('de-DE')} – ${max.toLocaleString('de-DE')} €`;
  }
  if (max) return `bis ${max.toLocaleString('de-DE')} €`;
  if (min) return `ab ${min.toLocaleString('de-DE')} €`;
  return null;
}

export function formatCreditHighlightSecondary(offer) {
  if (offer.note_small?.trim()) return offer.note_small.trim();
  const minDays = Number(offer.payout_days_min);
  const maxDays = Number(offer.payout_days_max);
  if (minDays && maxDays) return `Auszahlung oft in ${minDays}–${maxDays} Tagen`;
  if (maxDays) return `Auszahlung oft innerhalb von ${maxDays} Tagen`;
  return 'Unverbindliche Konditionen · persönliche Beratung';
}

/** Bewertung 0–10 (wie /kredit und Spar-Karten). */
export function creditRatingOutOfTen(offer) {
  const raw = Number(offer.rating_value);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return Math.min(10, Math.max(0, raw));
}

/** 0–5 für Stern-Anzeige (proportional zu /10). */
export function creditRatingStarScore(offer) {
  const ten = creditRatingOutOfTen(offer);
  if (ten == null) return null;
  return ten / 2;
}

/** @param {Array<Record<string, unknown>>} rows */
export function mapCreditOffersForCarousel(rows) {
  return (rows || [])
    .map((o) => ({
      ...o,
      bank_name: o.banks?.name || '',
      bank_logo: o.banks?.logo_url || null,
      country: o.banks?.country || '',
      founded_year: o.banks?.founded_year ?? null,
      regulator_name: o.banks?.regulator_name ?? null,
    }))
    .sort((a, b) => {
      const pri = Number(a.sort_priority ?? 100) - Number(b.sort_priority ?? 100);
      if (pri !== 0) return pri;
      return Number(a.effective_rate_from ?? 0) - Number(b.effective_rate_from ?? 0);
    });
}
