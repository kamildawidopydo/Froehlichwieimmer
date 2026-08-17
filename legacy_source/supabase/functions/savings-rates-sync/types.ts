export type ProductTypeDe = 'Tagesgeld' | 'Flexgeld' | 'Festgeld';
export type RaisinProductType = 'OVERNIGHT' | 'NOTICE' | 'TERM';

export interface ResolvedRate {
  rate: number;
  source: string;
  note?: string;
  effectiveDate?: string;
}

export interface RaisinOffer {
  productType: RaisinProductType;
  productTypeDe: ProductTypeDe;
  rate: number;
  termMonths: number | null;
  productName?: string;
  effectiveDate?: string;
}

export interface OfferRow {
  id: string;
  interest_rate: number;
  investment_type: string | null;
  deposit_term: number;
  bank_slug: string;
}

export interface SyncResult {
  updated: number;
  skipped: number;
  failed: number;
  details: Array<{
    bank_slug: string;
    offer_id?: string;
    status: 'updated' | 'skipped' | 'failed' | 'unchanged';
    old_rate?: number;
    new_rate?: number;
    source?: string;
    error?: string;
  }>;
}
