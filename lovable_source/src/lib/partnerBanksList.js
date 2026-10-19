import { featuredBanks } from '@/data/partnerBanksFeatured';
import { findBankRowForFeatured, normalizeBankKey } from '@/lib/partnerBankLogoMatch';
import { isExcludedSavingsBankSlug } from '@/lib/comparisonCatalog';

const COUNTRY_META = {
  Germany: { de: 'Deutschland', iso: 'DEU', flag: '🇩🇪' },
  France: { de: 'Frankreich', iso: 'FRA', flag: '🇫🇷' },
  Italy: { de: 'Italien', iso: 'ITA', flag: '🇮🇹' },
  Spain: { de: 'Spanien', iso: 'ESP', flag: '🇪🇸' },
  Netherlands: { de: 'Niederlande', iso: 'NLD', flag: '🇳🇱' },
  Austria: { de: 'Österreich', iso: 'AUT', flag: '🇦🇹' },
  Belgium: { de: 'Belgien', iso: 'BEL', flag: '🇧🇪' },
  Sweden: { de: 'Schweden', iso: 'SWE', flag: '🇸🇪' },
  Portugal: { de: 'Portugal', iso: 'PRT', flag: '🇵🇹' },
  Poland: { de: 'Polen', iso: 'POL', flag: '🇵🇱' },
  Finland: { de: 'Finnland', iso: 'FIN', flag: '🇫🇮' },
  Denmark: { de: 'Dänemark', iso: 'DNK', flag: '🇩🇰' },
  Ireland: { de: 'Irland', iso: 'IRL', flag: '🇮🇪' },
  Luxembourg: { de: 'Luxemburg', iso: 'LUX', flag: '🇱🇺' },
  Greece: { de: 'Griechenland', iso: 'GRC', flag: '🇬🇷' },
  Estonia: { de: 'Estland', iso: 'EST', flag: '🇪🇪' },
  Norway: { de: 'Norwegen', iso: 'NOR', flag: '🇳🇴' },
  Latvia: { de: 'Lettland', iso: 'LVA', flag: '🇱🇻' },
  Lithuania: { de: 'Litauen', iso: 'LTU', flag: '🇱🇹' },
  'Czech Republic': { de: 'Tschechien', iso: 'CZE', flag: '🇨🇿' },
  Switzerland: { de: 'Schweiz', iso: 'CHE', flag: '🇨🇭' },
};

function getCountryMeta(country) {
  return COUNTRY_META[country] || { de: country || 'Europa', iso: 'EU', flag: '🌍' };
}

export function findFeaturedForBankRow(bankRow, featuredList = featuredBanks) {
  if (!bankRow?.name) return null;
  for (const featured of featuredList) {
    const matched = findBankRowForFeatured([bankRow], featured.name, featured.logoAliases);
    if (matched) return featured;
  }
  return null;
}

const PARTNER_BANK_LOGO_BY_SLUG = {
  'ebn-banco': '/assets/bank-logos/ebn-banco.svg',
  postbank: '/assets/bank-logos/postbank-official.svg',
  'ing-nederland': '/assets/bank-logos/ing-logo.jpg',
  rabobank: '/assets/bank-logos/rabobank-wordmark.svg',
  'bunq-nederland': '/assets/bank-logos/bunq-logo.svg',
  'bunq-deutschland': '/assets/bank-logos/bunq-logo.svg',
};

function resolvePartnerBankLogo(bank, featured) {
  const curated = featured?.logoLocal || PARTNER_BANK_LOGO_BY_SLUG[bank.slug] || null;
  const dbLogo = bank.logo_url ? String(bank.logo_url).trim() || null : null;
  return curated || dbLogo;
}

function pickPreferredCard(existing, candidate) {
  if (candidate.logoUrl && !existing.logoUrl) return candidate;
  if (existing.logoUrl && !candidate.logoUrl) return existing;
  if (candidate.logoLocal && !existing.logoLocal) return candidate;
  return existing;
}

function defaultDescription(bank) {
  const country = getCountryMeta(bank.country).de;
  const regulator = bank.regulator_name?.trim();
  if (regulator) {
    return `Reguliertes Finanzinstitut (${regulator}) mit gesetzlicher Einlagensicherung — ${country}.`;
  }
  return `Reguliertes europäisches Finanzinstitut mit gesetzlicher Einlagensicherung — ${country}.`;
}

/**
 * Build partner bank cards from unique banks linked to active savings offers (Sparvergleich source).
 * Featured entries enrich display name, copy, and logo fallbacks when matched.
 */
export function buildPartnerBankCards(banksFromOffers) {
  const seen = new Map();

  for (const bank of banksFromOffers || []) {
    if (!bank?.id || seen.has(bank.id) || isExcludedSavingsBankSlug(bank.slug)) continue;
    seen.set(bank.id, bank);
  }

  const byDisplayName = new Map();

  for (const bank of seen.values()) {
    const featured = findFeaturedForBankRow(bank);
    const countryMeta = getCountryMeta(bank.country);
    const featuredIndex = featured ? featuredBanks.indexOf(featured) : Number.POSITIVE_INFINITY;

    const card = {
      id: bank.id,
      name: featured?.name || bank.name,
      country: featured?.country || countryMeta.de,
      iso: featured?.iso || countryMeta.iso,
      flag: featured?.flag || countryMeta.flag,
      description: featured?.description || defaultDescription(bank),
      depositProtection:
        bank.deposit_protection?.trim() ||
        featured?.depositProtection ||
        'EU-Einlagensicherung bis 100.000 €',
      founded: bank.founded_year ? String(bank.founded_year) : featured?.founded || null,
      logoUrl: resolvePartnerBankLogo(bank, featured),
      logoLocal: featured?.logoLocal || PARTNER_BANK_LOGO_BY_SLUG[bank.slug] || '',
      featuredIndex,
    };

    const key = normalizeBankKey(card.name);
    if (byDisplayName.has(key)) {
      byDisplayName.set(key, pickPreferredCard(byDisplayName.get(key), card));
    } else {
      byDisplayName.set(key, card);
    }
  }

  const cards = [...byDisplayName.values()];

  cards.sort((a, b) => {
    if (a.featuredIndex !== b.featuredIndex) return a.featuredIndex - b.featuredIndex;
    return a.name.localeCompare(b.name, 'de');
  });

  return cards;
}

export function formatPartnerBankCountryCodes(cards) {
  const codes = [...new Set(cards.map((c) => c.iso).filter(Boolean))].sort();
  return codes.join(' · ');
}
