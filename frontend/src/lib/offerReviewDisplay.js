import {
  getReviewTotal as getSeedReviewTotal,
  getStarAverageForOffer as getSeedStarAverage,
  getStarDistribution as getSeedStarDistribution,
  buildReviewEntries as buildSeedReviewEntries,
} from '@/data/comparisonProfiles';
import { roundToQuarter } from '@/lib/starRating';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

function filterByProduct(entries, productFilter) {
  if (!productFilter || productFilter === 'Alle') return entries;
  return entries.filter((e) => e.productType === productFilter);
}

/** Kopfzahl: freigegebene + Seed (gewichteter Schnitt). */
export function resolveReviewDisplay(offer, dbStats) {
  const approvedCount = dbStats?.count ?? 0;
  const seedCount = getSeedReviewTotal(offer);
  const seedAvg = getSeedStarAverage(offer);

  if (approvedCount > 0 && dbStats?.average != null) {
    const approvedAvg = roundToQuarter(dbStats.average);
    const totalCount = approvedCount + seedCount;
    const blended =
      totalCount > 0
        ? roundToQuarter((approvedAvg * approvedCount + seedAvg * seedCount) / totalCount)
        : seedAvg;
    return {
      count: totalCount,
      average: blended,
      source: 'mixed',
    };
  }

  return {
    count: seedCount,
    average: seedAvg,
    source: 'seed',
  };
}

/** Sternverteilung [5★, 4★, 3★, 2★, 1★] – Seed + freigegebene addiert. */
export function starCountsFromApprovedReviews(reviews) {
  const counts = [0, 0, 0, 0, 0];
  for (const r of reviews || []) {
    const stars = Number(r.stars);
    if (!Number.isFinite(stars)) continue;
    const bucket = Math.min(5, Math.max(1, Math.round(stars)));
    counts[5 - bucket] += 1;
  }
  return counts;
}

export function getDisplayStarDistribution(offer, dbStats, approvedRows) {
  const display = resolveReviewDisplay(offer, dbStats);
  const seedCounts = getSeedStarDistribution(offer, display.average);
  const approvedEntries = (approvedRows || []).map(mapApprovedReviewToEntry);
  if (!approvedEntries.length) return seedCounts;
  const userCounts = starCountsFromApprovedReviews(approvedEntries);
  return seedCounts.map((c, i) => c + userCounts[i]);
}

export function mapApprovedReviewToEntry(row) {
  return {
    id: row.id,
    author: row.author_display_name,
    date: format(new Date(row.created_at), 'dd.MM.yyyy', { locale: de }),
    stars: roundToQuarter(Number(row.stars)),
    text: row.body,
    productType: row.product_type,
    source: 'user',
  };
}

/** Freigegebene Nutzerbewertungen zuerst, danach Seed (Anzahl = getReviewTotal). */
export function buildDisplayReviewEntries(offer, productFilter, approvedRows) {
  const approved = filterByProduct(
    (approvedRows || []).map(mapApprovedReviewToEntry),
    productFilter
  );
  const seedAll = buildSeedReviewEntries(offer).map((e) => ({ ...e, source: 'seed' }));
  const seed = filterByProduct(seedAll, productFilter);
  return [...approved, ...seed];
}
