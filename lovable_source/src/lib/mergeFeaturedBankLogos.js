/**
 * Match featured marketing names to `banks` rows (same `logo_url` source as SavingsComparison).
 */
export function normalizeBankKey(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * @param {Array<{ name: string, logo_url?: string|null }>} dbRows
 * @param {Array<{ name: string, logo: string }>} featuredList — stable display order
 */
export function mergeFeaturedBankLogos(featuredList, dbRows) {
  if (!Array.isArray(dbRows) || dbRows.length === 0) return featuredList;

  return featuredList.map((f) => {
    const hit = findBankRow(dbRows, f.name);
    if (hit?.logo_url) return { ...f, logo: hit.logo_url };
    return f;
  });
}

function findBankRow(rows, featuredName) {
  const want = normalizeBankKey(featuredName);
  if (!want) return null;

  let r = rows.find((b) => normalizeBankKey(b.name) === want);
  if (r) return r;

  r = rows.find((b) => {
    const bn = normalizeBankKey(b.name);
    return bn.startsWith(`${want} `) || bn.startsWith(want);
  });
  if (r) return r;

  const parts = want.split(/\s+/).filter((p) => p.length > 1);
  if (parts.length) {
    const multi = rows.filter((b) => {
      const bn = normalizeBankKey(b.name);
      return parts.every((p) => bn.includes(p));
    });
    if (multi.length === 1) return multi[0];
    if (multi.length > 1) {
      return multi.sort((a, b) => normalizeBankKey(a.name).length - normalizeBankKey(b.name).length)[0];
    }
  }

  if (want.length <= 5) {
    r = rows.find((b) => {
      const bn = normalizeBankKey(b.name);
      if (bn === want) return true;
      const tokens = bn.split(/\s+/);
      return tokens.includes(want) || bn.startsWith(`${want} `);
    });
    if (r) return r;
  }

  return rows.find((b) => normalizeBankKey(b.name).includes(want)) || null;
}
