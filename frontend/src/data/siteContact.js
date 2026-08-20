/** Single source for Fröhlich Vermögensberatung contact blocks (Kontaktseite, Spezial-AIF CTA, etc.). */

const NBSP = '\u00A0';

/** Group national digits (without +49) for readable display, e.g. 74568549983 → 74 568 549 983 */
function formatNationalGroups(nationalDigits, groups) {
  let i = 0;
  return groups
    .map((len) => nationalDigits.slice(i, (i += len)))
    .filter(Boolean)
    .join(NBSP);
}

/** E.164 → +49 with rhythmic spacing (display only; tel: link stays compact). */
export function formatGermanPhoneDisplay(tel, nationalGroups) {
  const digits = String(tel).replace(/\D/g, '');
  if (!digits.startsWith('49')) return String(tel);
  const national = digits.slice(2);
  return `+49${NBSP}${formatNationalGroups(national, nationalGroups)}`;
}

// TODO(Fröhlich Vermögensberatung): echte Telefonnummer(n) bestätigen — technischer Platzhalter.
const PRIMARY_PHONE_TEL = '+4940334657988';

const siteContact = {
  // TODO(Fröhlich Vermögensberatung): finale Kundenservice-Adresse bestätigen — technischer Platzhalter.
  email: 'kontakt@froehlich-vermoegensberatung.de',
  /** Primary Kundenservice line — site-wide, emails, PDFs, support. */
  phoneTel: PRIMARY_PHONE_TEL,
  phoneDisplay: formatGermanPhoneDisplay(PRIMARY_PHONE_TEL, [2, 3, 3, 3]),
  phoneLabel: 'Kundenservice',
  // TODO(Fröhlich Vermögensberatung): Sekundärnummer (falls vorhanden) ergänzen.
  phoneSecondaryTel: PRIMARY_PHONE_TEL,
  phoneSecondaryDisplay: formatGermanPhoneDisplay(PRIMARY_PHONE_TEL, [2, 3, 3, 3]),
  companyName: 'Fröhlich Vermögensberatung GmbH',
  street: 'Bösgrunder Weg 62',
  postalCity: '55543 Bad Kreuznach',
  /** Kundenbetreuung (Impressum) — same as Hauptsitz. */
  customerServiceStreet: 'Bösgrunder Weg 62',
  customerServicePostalCity: '55543 Bad Kreuznach',
  /** Same postal line as legacy Contact copy (includes · DE). */
  postalCityDe: '55543 Bad Kreuznach · DE',
  businessHoursLine: 'Mo–Fr · 09:00 – 18:00',
};

export default siteContact;
export { siteContact };
