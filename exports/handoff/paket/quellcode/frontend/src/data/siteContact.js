/** Single source for Fröhlich Vermögensberatung contact blocks (Kontaktseite, Spezial-AIF CTA, etc.). */

/** Zentrale Domain- und Kontakt-Konfiguration — Änderungen hier greifen projektweit. */
export const SITE_URL = 'https://essenceinvest.com/';
export const SITE_DOMAIN = 'essenceinvest.com';
export const CUSTOMER_SERVICE_EMAIL = 'kundenservice@essenceinvest.com';

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

// Kundenservice-Hauptnummer (Frankfurt) — projektweit verwendet.
const PRIMARY_PHONE_TEL = '+4969667785941';
const PRIMARY_PHONE_DISPLAY = '06966 7785 941';

const siteContact = {
  email: CUSTOMER_SERVICE_EMAIL,
  /** Primary Kundenservice line — site-wide, emails, PDFs, support. */
  phoneTel: PRIMARY_PHONE_TEL,
  phoneDisplay: PRIMARY_PHONE_DISPLAY,
  phoneLabel: 'Kundenservice',
  // TODO(Fröhlich Vermögensberatung): Sekundärnummer (falls vorhanden) ergänzen.
  phoneSecondaryTel: PRIMARY_PHONE_TEL,
  phoneSecondaryDisplay: PRIMARY_PHONE_DISPLAY,
  companyName: 'Fröhlich Vermögensberatung GmbH',
  street: 'Bösgrunder Weg 62',
  postalCity: '55543 Bad Kreuznach',
  /** Kundenbetreuung (Impressum) — same as Hauptsitz. */
  customerServiceStreet: 'Bösgrunder Weg 62',
  customerServicePostalCity: '55543 Bad Kreuznach',
  /** Same postal line as legacy Contact copy (includes · DE). */
  postalCityDe: '55543 Bad Kreuznach · DE',
  businessHoursLine: 'Mo–Fr · 09:00 – 18:00',
  /** Öffentliche Marketing-Domain / Website. */
  websiteUrl: SITE_URL,
  websiteDomain: SITE_DOMAIN,
};

export default siteContact;
export { siteContact };
