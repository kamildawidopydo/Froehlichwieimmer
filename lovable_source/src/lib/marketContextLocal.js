/**
 * Lokale Portierung von GET /api/content/comparison/context (backend/server.py).
 *
 * EZB-Referenz stammt 1:1 aus backend/savings_data.py (EZB_REFERENCE) —
 * inklusive Quelle, Stand und Verifizierungszeitpunkt. Die Top-Zinsen werden
 * wie im Original aus den vorhandenen Angeboten abgeleitet, nicht angenommen.
 */
import savingsOffers from '@/data/savingsOffers.json';

export const EZB_REFERENCE = {
  deposit_facility_rate: 2.25,
  main_refinancing_rate: 2.4,
  marginal_lending_rate: 2.65,
  effective_date: '2026-06-05',
  source_name: 'Europäische Zentralbank',
  source_url:
    'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html',
  last_verified_at: '2026-08-27T00:00:00+00:00',
};

/** Plausibilitätsgrenzen wie in backend/savings_data.py::is_plausible_rate */
function isPlausibleRate(rate) {
  const n = Number(rate);
  return Number.isFinite(n) && n > 0 && n <= 10;
}

export function getComparisonContext() {
  const fresh = savingsOffers.filter(
    (o) => isPlausibleRate(o.interest_rate) && o.is_active !== false,
  );

  const best = (list) =>
    list.reduce(
      (acc, o) => (acc == null || Number(o.interest_rate) > Number(acc.interest_rate) ? o : acc),
      null,
    );

  return {
    ecb: EZB_REFERENCE,
    top_tagesgeld: best(fresh.filter((o) => o.product_type === 'tagesgeld')),
    top_festgeld_12m: best(
      fresh.filter((o) => o.product_type === 'festgeld' && Number(o.term_months) === 12),
    ),
    generated_at: new Date().toISOString(),
  };
}
