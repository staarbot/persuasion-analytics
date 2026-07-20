// Seed implementation of both providers, reading data/seed.json.
// Swap that file for a real export (same SeedDataset shape) to demo with
// real numbers — no code changes.

import seed from "@/data/seed.json";
import type { SeedDataset } from "@/lib/types";
import type { AdsProvider, DateRange, RevenueProvider } from "./types";

const data = seed as unknown as SeedDataset;

const inRange = (date: string, range: DateRange) =>
  date >= range.from && date <= range.to;

export const seedAdsProvider: AdsProvider = {
  async getAds() {
    return data.ads;
  },
  async getCopyAssets() {
    return data.copyAssets;
  },
  async getCreativeAssets() {
    return data.creativeAssets;
  },
  async getDailyMetrics(range) {
    return data.dailyMetrics.filter((m) => inRange(m.date, range));
  },
  async getDataStartDate() {
    let min = data.dailyMetrics[0]?.date ?? "2026-01-01";
    for (const m of data.dailyMetrics) if (m.date < min) min = m.date;
    return min;
  },
  async getDataEndDate() {
    let max = data.dailyMetrics[0]?.date ?? "2026-01-01";
    for (const m of data.dailyMetrics) if (m.date > max) max = m.date;
    return max;
  },
};

export const seedRevenueProvider: RevenueProvider = {
  async getSales(range) {
    return data.sales.filter((s) => inRange(s.date, range));
  },
};
