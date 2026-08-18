/** Single source for kapitalmitte.com contact blocks (Kontaktseite, Spezial-AIF CTA, etc.). */

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

const HAITERBACH_PHONE_TEL = '+4940334657988';
const FRANKFURT_PHONE_TEL = '+4969205690994';

const siteContact = {
  email: 'kundenservice@kapitalmitte.com',
  /** Primary Kundenservice — Haiterbach (site-wide, emails, PDFs, support). */
  phoneTel: HAITERBACH_PHONE_TEL,
  phoneDisplay: formatGermanPhoneDisplay(HAITERBACH_PHONE_TEL, [2, 3, 3, 3]),
  phoneLabel: 'Haiterbach Kundenservice',
  /** Secondary line — Impressum only (Frankfurt / Hauptsitz). */
  phoneSecondaryTel: FRANKFURT_PHONE_TEL,
  phoneSecondaryDisplay: formatGermanPhoneDisplay(FRANKFURT_PHONE_TEL, [2, 4, 5]),
  companyName: 'Alexander Wahl Vermögensverwaltung GmbH',
  street: 'Hallgartenstraße 57',
  postalCity: '60389 Frankfurt am Main',
  /** Kundenbetreuung (Impressum) — same as Hauptsitz. */
  customerServiceStreet: 'Hallgartenstraße 57',
  customerServicePostalCity: '60389 Frankfurt am Main',
  /** Same postal line as legacy Contact copy (includes · DE). */
  postalCityDe: '60389 Frankfurt am Main · DE',
  businessHoursLine: 'Mo–Fr · 09:00 – 18:00',
};

export default siteContact;
export { siteContact };
