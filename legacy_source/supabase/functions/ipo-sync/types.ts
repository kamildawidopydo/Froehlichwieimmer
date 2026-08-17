export type IpoSource = 'euronext' | 'yahoo' | 'nasdaq' | 'stockanalysis' | 'sec_filed' | 'manual';

export type IpoStatus =
  | 'upcoming'
  | 'open'
  | 'priced'
  | 'filed'
  | 'listed'
  | 'cancelled';

export interface ParsedIpoRow {
  externalKey: string;
  source: IpoSource;
  companyName: string;
  tickerProposed: string | null;
  isin: string | null;
  exchange: string | null;
  market: string | null;
  sector: string | null;
  ipoDate: string | null; // YYYY-MM-DD
  priceRangeLow: number | null;
  priceRangeHigh: number | null;
  priceCurrency?: 'USD' | 'EUR';
  prospectusUrl: string | null;
  autoStatus?: IpoStatus;
}

export interface SyncResult {
  upserted: number;
  skipped: number;
  promoted: number;
  errors: string[];
}
