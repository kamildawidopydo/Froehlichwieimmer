export const hasStructuredAddress = (profile) =>
  [
    profile?.address_street,
    profile?.address_house_number,
    profile?.address_postal_code,
    profile?.address_city,
  ].some((v) => String(v || '').trim());

export const formatLegacyAddress = (address) =>
  String(address || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(', ');

export const emptyAddressForm = () => ({
  address_street: '',
  address_house_number: '',
  address_line_2: '',
  address_postal_code: '',
  address_city: '',
});

export const addressFromProfile = (profile) => ({
  address_street: profile?.address_street || '',
  address_house_number: profile?.address_house_number || '',
  address_line_2: profile?.address_line_2 || '',
  address_postal_code: profile?.address_postal_code || '',
  address_city: profile?.address_city || '',
});

export const buildFullAddress = (form) => {
  const streetLine = [form.address_street, form.address_house_number]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .join(' ');
  const cityLine = [form.address_postal_code, form.address_city]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .join(' ');
  const line2 = String(form.address_line_2 || '').trim();
  return [streetLine, line2, cityLine].filter(Boolean).join('\n');
};

export const validateAddressForm = (form) => {
  const street = String(form.address_street || '').trim();
  const houseNumber = String(form.address_house_number || '').trim();
  const postalCode = String(form.address_postal_code || '').trim();
  const city = String(form.address_city || '').trim();

  if (!street) return { ok: false, message: 'Straße ist erforderlich' };
  if (!houseNumber) return { ok: false, message: 'Hausnummer ist erforderlich' };
  if (!postalCode) return { ok: false, message: 'PLZ ist erforderlich' };
  if (!/^\d+$/.test(postalCode)) return { ok: false, message: 'PLZ darf nur Ziffern enthalten' };
  if (!city) return { ok: false, message: 'Ort ist erforderlich' };
  if (/\d/.test(city)) return { ok: false, message: 'Ort darf keine Ziffern enthalten' };

  return { ok: true };
};

export const addressFormToDbPayload = (form) => ({
  address_street: String(form.address_street || '').trim(),
  address_house_number: String(form.address_house_number || '').trim(),
  address_line_2: String(form.address_line_2 || '').trim() || null,
  address_postal_code: String(form.address_postal_code || '').trim(),
  address_city: String(form.address_city || '').trim(),
  address: buildFullAddress(form),
});
