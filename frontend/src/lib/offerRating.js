/**
 * Einheitliche Angebotsbewertung für Karten und „zum Vergleich“-Ansicht.
 * BBVA fest 9,9; alle anderen aus dem Zinssatz abgeleitet (stabil, plausibel).
 */
export function isBbvaOffer(offer) {
  return (offer?.bank_name || '').toLowerCase().includes('bbva');
}

export function getOfferRatingValue(offer) {
  if (!offer) return 7.5;
  if (isBbvaOffer(offer)) return 9.9;
  const rate = Number(offer.interest_rate) || 0;
  const raw = 7.5 + rate * 0.75;
  return Math.min(9.9, Math.max(7.5, raw));
}

export function formatDeScore(value) {
  const n = Math.round(Number(value) * 10) / 10;
  return n.toFixed(1).replace('.', ',');
}

export function getOfferRatingLabel(value) {
  if (value >= 9.5) return 'Exzellent';
  if (value >= 9.0) return 'Hervorragend';
  if (value >= 8.5) return 'Sehr gut';
  if (value >= 8.0) return 'Gut';
  return 'Solide';
}

export function getOfferRatingBundle(offer) {
  const value = getOfferRatingValue(offer);
  return {
    value,
    formatted: formatDeScore(value),
    label: getOfferRatingLabel(value),
  };
}
