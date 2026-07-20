// Asset-level aggregation: roll ad performance up to the copy/creative
// assets behind the ads, and to copy × creative pairings.

import type { Ad, AdDailyMetrics, Sale } from "@/lib/types";
import type { DateRange } from "@/lib/providers/types";
import { aggregate, type Totals } from "@/lib/metrics";

export interface AssetPerf {
  totals: Totals;
  adIds: string[];
  /** Distinct partner-asset ids this asset was paired with */
  partnerIds: string[];
}

export interface PairingPerf {
  copyAssetId: string;
  creativeAssetId: string;
  totals: Totals;
  adIds: string[];
}

export interface AssetRollup {
  byCopy: Map<string, AssetPerf>;
  byCreative: Map<string, AssetPerf>;
  /** key: `${creativeAssetId}|${copyAssetId}` */
  pairings: Map<string, PairingPerf>;
  perAd: Map<string, Totals>;
}

export const pairKey = (creativeAssetId: string, copyAssetId: string) =>
  `${creativeAssetId}|${copyAssetId}`;

export function rollupAssets(
  ads: Ad[],
  rows: AdDailyMetrics[],
  sales: Sale[],
  range: DateRange
): AssetRollup {
  // Group raw rows/sales by ad once
  const rowsByAd = new Map<string, AdDailyMetrics[]>();
  for (const r of rows) {
    if (r.date < range.from || r.date > range.to) continue;
    const list = rowsByAd.get(r.adId);
    if (list) list.push(r);
    else rowsByAd.set(r.adId, [r]);
  }
  const salesByAd = new Map<string, Sale[]>();
  for (const s of sales) {
    if (!s.adId || s.date < range.from || s.date > range.to) continue;
    const list = salesByAd.get(s.adId);
    if (list) list.push(s);
    else salesByAd.set(s.adId, [s]);
  }

  const perAd = new Map<string, Totals>();
  const rowsByCopy = new Map<string, AdDailyMetrics[]>();
  const salesByCopy = new Map<string, Sale[]>();
  const rowsByCreative = new Map<string, AdDailyMetrics[]>();
  const salesByCreative = new Map<string, Sale[]>();
  const rowsByPair = new Map<string, AdDailyMetrics[]>();
  const salesByPair = new Map<string, Sale[]>();
  const adsByCopy = new Map<string, string[]>();
  const adsByCreative = new Map<string, string[]>();
  const adsByPair = new Map<string, string[]>();
  const partnersByCopy = new Map<string, Set<string>>();
  const partnersByCreative = new Map<string, Set<string>>();

  const push = <T,>(m: Map<string, T[]>, k: string, items: T[]) => {
    if (!items.length) return;
    const list = m.get(k);
    if (list) list.push(...items);
    else m.set(k, [...items]);
  };

  for (const ad of ads) {
    const adRows = rowsByAd.get(ad.id) ?? [];
    const adSales = salesByAd.get(ad.id) ?? [];
    perAd.set(ad.id, aggregate(adRows, adSales));
    if (!adRows.length && !adSales.length) continue;

    const pk = pairKey(ad.creativeAssetId, ad.copyAssetId);
    push(rowsByCopy, ad.copyAssetId, adRows);
    push(salesByCopy, ad.copyAssetId, adSales);
    push(rowsByCreative, ad.creativeAssetId, adRows);
    push(salesByCreative, ad.creativeAssetId, adSales);
    push(rowsByPair, pk, adRows);
    push(salesByPair, pk, adSales);
    push(adsByCopy, ad.copyAssetId, [ad.id]);
    push(adsByCreative, ad.creativeAssetId, [ad.id]);
    push(adsByPair, pk, [ad.id]);
    (partnersByCopy.get(ad.copyAssetId) ??
      partnersByCopy.set(ad.copyAssetId, new Set()).get(ad.copyAssetId)!).add(
      ad.creativeAssetId
    );
    (partnersByCreative.get(ad.creativeAssetId) ??
      partnersByCreative
        .set(ad.creativeAssetId, new Set())
        .get(ad.creativeAssetId)!).add(ad.copyAssetId);
  }

  const byCopy = new Map<string, AssetPerf>();
  for (const [id, list] of rowsByCopy) {
    byCopy.set(id, {
      totals: aggregate(list, salesByCopy.get(id) ?? []),
      adIds: adsByCopy.get(id) ?? [],
      partnerIds: [...(partnersByCopy.get(id) ?? [])],
    });
  }
  const byCreative = new Map<string, AssetPerf>();
  for (const [id, list] of rowsByCreative) {
    byCreative.set(id, {
      totals: aggregate(list, salesByCreative.get(id) ?? []),
      adIds: adsByCreative.get(id) ?? [],
      partnerIds: [...(partnersByCreative.get(id) ?? [])],
    });
  }
  const pairings = new Map<string, PairingPerf>();
  for (const [pk, list] of rowsByPair) {
    const [creativeAssetId, copyAssetId] = pk.split("|");
    pairings.set(pk, {
      creativeAssetId,
      copyAssetId,
      totals: aggregate(list, salesByPair.get(pk) ?? []),
      adIds: adsByPair.get(pk) ?? [],
    });
  }

  return { byCopy, byCreative, pairings, perAd };
}
