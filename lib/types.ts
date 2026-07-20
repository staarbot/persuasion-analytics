// Core entities. This schema is the handoff contract: the destination app
// persists these in its own database and feeds them through the provider
// interfaces in lib/providers/types.ts.

export type CreativeType = "video" | "image";

export interface CopyAsset {
  id: string;
  /** Display code, e.g. "C1" */
  code: string;
  name: string;
  /** The full ad copy as it ran */
  fullText: string;
  description: string;
  notes: string;
  source: "persuasion-system" | "manual";
  createdAt: string; // ISO date
}

export interface CreativeAsset {
  id: string;
  /** Display code, e.g. "V2" (video) or "I1" (static image) */
  code: string;
  type: CreativeType;
  name: string;
  description: string;
  /** Image prompt (statics) or video script (videos) */
  promptOrScript: string;
  notes: string;
  thumbnailUrl: string | null;
  createdAt: string;
}

/**
 * An ad is the join of one copy asset and one creative asset, deployed
 * against an audience. Its display name is ALWAYS derived — never stored —
 * via adLabel(): "001 · V1-C1".
 */
export interface Ad {
  id: string;
  /** Sequence number within the account; label derives from this */
  seq: number;
  metaAdId: string;
  postId: string;
  postUrl: string | null;
  copyAssetId: string;
  creativeAssetId: string;
  adSetName: string;
  status: "active" | "paused" | "archived";
  launchedAt: string; // ISO date
}

/**
 * One row per ad per day — the only stored performance grain.
 * Field names mirror the Meta Marketing API Insights response
 * (time_increment=1); see docs/meta-field-map.md for the mapping.
 */
export interface AdDailyMetrics {
  adId: string;
  date: string; // ISO date (account timezone)
  impressions: number;
  reach: number;
  /** All clicks (Meta "clicks") */
  clicks: number;
  /** Link clicks (Meta actions: link_click) */
  linkClicks: number;
  /** Spend in account currency */
  spend: number;
  /** Meta video_3_sec_watched_actions (null for statics) */
  video3sViews: number | null;
  /** Meta video_thruplay_watched_actions (null for statics) */
  thruplays: number | null;
  /** Meta-attributed purchases (pixel/CAPI) */
  metaPurchases: number;
  /** Meta-attributed purchase conversion value */
  metaPurchaseValue: number;
}

export type SaleSource = "stripe" | "meta_attributed" | "manual";
export type SaleType = "FE" | "BE";

/**
 * One row per transaction. Source is always carried so Stripe truth,
 * Meta-attributed fallback, and manual entries are never silently mixed.
 */
export interface Sale {
  id: string;
  date: string; // ISO date
  amount: number;
  productId: string;
  productName: string;
  /** FE = the designated front-end product (config), everything else BE */
  type: SaleType;
  source: SaleSource;
  customerId: string;
  /** True if this is the customer's first known purchase */
  isNewCustomer: boolean;
  /** Attributed ad where known (nullable — attribution is imperfect) */
  adId: string | null;
}

export interface SeedDataset {
  generatedAt: string;
  copyAssets: CopyAsset[];
  creativeAssets: CreativeAsset[];
  ads: Ad[];
  dailyMetrics: AdDailyMetrics[];
  sales: Sale[];
}

/** "001 · V1-C1" — derived, never stored. */
export function adLabel(
  ad: Ad,
  creative: CreativeAsset | undefined,
  copy: CopyAsset | undefined
): string {
  const seq = String(ad.seq).padStart(3, "0");
  const pair = `${creative?.code ?? "?"}-${copy?.code ?? "?"}`;
  return `${seq} · ${pair}`;
}
