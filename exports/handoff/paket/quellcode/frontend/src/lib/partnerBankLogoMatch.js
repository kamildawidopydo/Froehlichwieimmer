/**
 * Match a featured partner label to a row from `banks` (Supabase), same source as Sparvergleich.
 * Prefers rows with a non-empty `logo_url` when several names could match.
 */

export function normalizeBankKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function rowMatchesNormalizedName(row, n) {
  const rn = normalizeBankKey(row.name);
  if (!n || !rn) return false;
  if (rn === n) return true;
  if (rn.startsWith(`${n} `)) return true;
  if (rn.includes(n)) return true;
  if (n.length >= 4 && n.includes(rn)) return true;
  return false;
}

function collectMatchesForQuery(rows, query) {
  const n = normalizeBankKey(query);
  if (!n) return [];
  return rows.filter((r) => rowMatchesNormalizedName(r, n));
}

/**
 * @param {{ name: string, logo_url?: string | null }[]} rows from banks table
 * @param {string} featuredName e.g. "BNP Paribas"
 * @param {string[]} [aliases] extra names as in Admin (e.g. "Banco Santander")
 */
export function findBankRowForFeatured(rows, featuredName, aliases = []) {
  if (!rows?.length) return null;

  const queries = [featuredName, ...(Array.isArray(aliases) ? aliases : [])].filter(Boolean);
  const seen = new Set();
  const matches = [];

  for (const query of queries) {
    for (const r of collectMatchesForQuery(rows, query)) {
      const key = r.name;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push(r);
    }
  }

  if (!matches.length) return null;

  const primaryNorm = normalizeBankKey(featuredName);
  const hasLogo = (r) => Boolean(r?.logo_url && String(r.logo_url).trim());

  const exact = matches.find((r) => normalizeBankKey(r.name) === primaryNorm);
  if (exact && hasLogo(exact)) return exact;

  const withLogo = matches.filter(hasLogo);
  if (withLogo.length === 1) return withLogo[0];
  if (withLogo.length > 1) {
    const exactLogo = withLogo.find((r) => normalizeBankKey(r.name) === primaryNorm);
    if (exactLogo) return exactLogo;
    return [...withLogo].sort((a, b) => a.name.length - b.name.length)[0];
  }

  if (exact) return exact;
  return [...matches].sort((a, b) => a.name.length - b.name.length)[0];
}
