/**
 * Frontend-Mirror der Backend-`compute_yield`-Logik (Session 93 · Phase 2).
 *
 * Damit Sortierung/Anzeige „erwarteter Ertrag" client-seitig sofort greift, ohne
 * für jede Filteränderung erneut Server-Response abzuwarten. Muss semantisch
 * identisch zur Backend-Version bleiben.
 */

const num = (v, fallback = null) => {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function computeYield(offer, amount, horizonMonths = null) {
  const amt = Math.max(num(amount, 0) || 0, 0);
  const productType = String(offer?.product_type || '').toLowerCase();
  const rateType = String(offer?.interest_rate_type || 'standard').toLowerCase();
  const nominalRate = num(offer?.interest_rate);
  const term = num(offer?.term_months);
  let horizon = horizonMonths;
  if (horizon === null || horizon === undefined) {
    horizon = productType === 'festgeld' && term ? term : 12;
  }
  horizon = Math.max(Math.floor(horizon || 0), 0);
  if (amt <= 0 || nominalRate === null || horizon === 0) {
    return {
      gross_return_eur: null,
      effective_rate: null,
      nominal_rate: nominalRate,
      horizon_months: horizon,
      breakdown: [],
      notes: [],
    };
  }
  const breakdown = [];
  const notes = [];

  if (productType === 'tagesgeld' || productType === 'flexgeld') {
    if (rateType === 'promo') {
      const promoRate = num(offer.promo_rate, nominalRate) ?? nominalRate;
      const promoMonths = Math.floor(num(offer.promo_duration_months, 0) || 0);
      const standardRate = num(offer.standard_rate_after_promo, promoRate) ?? promoRate;
      const promoApplied = Math.min(promoMonths, horizon);
      const remainder = Math.max(horizon - promoApplied, 0);
      if (promoApplied > 0) {
        breakdown.push({
          months: promoApplied,
          rate: promoRate,
          amount: amt,
          gross_eur: round2((amt * promoRate) / 100 * (promoApplied / 12)),
          label: 'Aktionszins',
        });
      }
      if (remainder > 0) {
        breakdown.push({
          months: remainder,
          rate: standardRate,
          amount: amt,
          gross_eur: round2((amt * standardRate) / 100 * (remainder / 12)),
          label: 'Folgezins',
        });
        notes.push(
          `Nach ${promoMonths} Monaten Aktionszins gilt der Folgezins von ${standardRate.toFixed(2)} % p.a.`
        );
      }
    } else {
      breakdown.push({
        months: horizon,
        rate: nominalRate,
        amount: amt,
        gross_eur: round2((amt * nominalRate) / 100 * (horizon / 12)),
        label: 'Zinssatz',
      });
    }
  } else if (productType === 'festgeld') {
    const applied = term ? Math.min(horizon, term) : horizon;
    breakdown.push({
      months: applied,
      rate: nominalRate,
      amount: amt,
      gross_eur: round2((amt * nominalRate) / 100 * (applied / 12)),
      label: 'Festzins',
    });
    if (term && horizon > term) {
      notes.push(
        `Betrachtungszeitraum (${horizon} M) > Laufzeit (${term} M). Erträge nach Ende der Bindung nicht enthalten.`
      );
    }
  } else {
    breakdown.push({
      months: horizon,
      rate: nominalRate,
      amount: amt,
      gross_eur: round2((amt * nominalRate) / 100 * (horizon / 12)),
      label: 'Zinssatz',
    });
  }

  const grossTotal = round2(breakdown.reduce((s, b) => s + b.gross_eur, 0));
  const effRate = horizon > 0 && amt > 0
    ? round3((grossTotal / amt) * (12 / horizon) * 100)
    : null;
  return {
    gross_return_eur: grossTotal,
    effective_rate: effRate,
    nominal_rate: nominalRate,
    horizon_months: horizon,
    breakdown,
    notes,
  };
}

function round2(v) { return Math.round(v * 100) / 100; }
function round3(v) { return Math.round(v * 1000) / 1000; }

export function formatEur(v) {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  return v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}
