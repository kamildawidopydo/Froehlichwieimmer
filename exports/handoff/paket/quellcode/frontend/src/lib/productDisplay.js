/** Anzeige-Bezeichnung — investment_type unverändert (Tagesgeld ≠ Flexgeld). */
export function getDisplayProductType(offer) {
  const raw = offer?.investment_type || (offer?.deposit_term === 0 ? 'Tagesgeld' : 'Festgeld');
  return raw;
}
