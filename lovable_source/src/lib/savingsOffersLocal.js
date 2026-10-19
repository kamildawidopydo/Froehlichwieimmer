import banksRaw from '@/data/banks.json';
import offersRaw from '@/data/savingsOffers.json';
import countriesRaw from '@/data/countries.json';
import { createSavingsQueries } from '@/lib/savingsQueries';

const q = createSavingsQueries(banksRaw, offersRaw, countriesRaw);
export const { COUNTRIES, querySavingsOffers, savingsOfferFacets, listPartnerBanks, querySavingsOffersFromSearch, getOfferRateHistory } = q;
