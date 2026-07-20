// Provider interfaces — the handoff seam.
//
// This demo ships one implementation (seed-provider, reading data/seed.json).
// The destination app implements the same two interfaces against the live
// Meta Marketing API and Stripe, and every screen keeps working untouched.

import type {
  Ad,
  AdDailyMetrics,
  CopyAsset,
  CreativeAsset,
  Sale,
} from "@/lib/types";

export interface DateRange {
  /** ISO date, inclusive */
  from: string;
  /** ISO date, inclusive */
  to: string;
}

/** Ad structure + daily performance. Live impl: Meta Marketing API. */
export interface AdsProvider {
  getAds(): Promise<Ad[]>;
  getCopyAssets(): Promise<CopyAsset[]>;
  getCreativeAssets(): Promise<CreativeAsset[]>;
  /** Daily grain (Meta insights time_increment=1) within the range */
  getDailyMetrics(range: DateRange): Promise<AdDailyMetrics[]>;
  /** Earliest date with any data — used for "lifetime" ranges */
  getDataStartDate(): Promise<string>;
  /** Latest complete day of data ("today" for the dataset) */
  getDataEndDate(): Promise<string>;
}

/** Transactions. Live impl: Stripe (preferred) or Meta-attributed fallback. */
export interface RevenueProvider {
  getSales(range: DateRange): Promise<Sale[]>;
}
