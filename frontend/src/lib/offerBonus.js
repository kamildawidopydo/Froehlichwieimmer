import { getOfferBonusAmount } from '@/data/bankBonusTexts';

export { getOfferBonusAmount };

export function enrichOfferWithBonus(offer) {
  if (!offer) return offer;
  return { ...offer, bonus_amount: getOfferBonusAmount(offer) };
}

export function enrichOffersWithBonus(offers) {
  return (offers || []).map(enrichOfferWithBonus);
}
