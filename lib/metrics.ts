// Aggregation + derived metrics. Daily rows and sales go in; every displayed
// number comes out. Derived metrics are NEVER stored — always computed here.

import type { AdDailyMetrics, Sale, SaleSource } from "@/lib/types";
import type { DateRange } from "@/lib/providers/types";

export interface Totals {
  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  spend: number;
  video3sViews: number;
  thruplays: number;
  metaPurchases: number;
  metaPurchaseValue: number;
  feSales: number;
  feRevenue: number;
  beSales: number;
  beRevenue: number;
  /** Which source the revenue figures come from (never silently mixed) */
  revenueSource: SaleSource | "none";
}

export const EMPTY_TOTALS: Totals = {
  impressions: 0,
  reach: 0,
  clicks: 0,
  linkClicks: 0,
  spend: 0,
  video3sViews: 0,
  thruplays: 0,
  metaPurchases: 0,
  metaPurchaseValue: 0,
  feSales: 0,
  feRevenue: 0,
  beSales: 0,
  beRevenue: 0,
  revenueSource: "none",
};

export function aggregate(rows: AdDailyMetrics[], sales: Sale[]): Totals {
  const t = { ...EMPTY_TOTALS };
  for (const r of rows) {
    t.impressions += r.impressions;
    t.reach += r.reach;
    t.clicks += r.clicks;
    t.linkClicks += r.linkClicks;
    t.spend += r.spend;
    t.video3sViews += r.video3sViews ?? 0;
    t.thruplays += r.thruplays ?? 0;
    t.metaPurchases += r.metaPurchases;
    t.metaPurchaseValue += r.metaPurchaseValue;
  }
  // Revenue source priority: stripe > meta_attributed > manual. Use the best
  // available source only, and label it.
  const bySource = (src: SaleSource) => sales.filter((s) => s.source === src);
  let used: Sale[] = [];
  for (const src of ["stripe", "meta_attributed", "manual"] as SaleSource[]) {
    const subset = bySource(src);
    if (subset.length > 0) {
      used = subset;
      t.revenueSource = src;
      break;
    }
  }
  for (const s of used) {
    if (s.type === "FE") {
      t.feSales += 1;
      t.feRevenue += s.amount;
    } else {
      t.beSales += 1;
      t.beRevenue += s.amount;
    }
  }
  // If no transaction-level source exists, fall back to Meta-attributed
  // pixel values (treated as FE revenue — the pixel can't split FE/BE).
  if (t.revenueSource === "none" && t.metaPurchases > 0) {
    t.revenueSource = "meta_attributed";
    t.feSales = t.metaPurchases;
    t.feRevenue = t.metaPurchaseValue;
  }
  return t;
}

// --- Derived metrics -------------------------------------------------------

const div = (a: number, b: number) => (b === 0 ? null : a / b);

export const derived = {
  ctr: (t: Totals) => div(t.clicks, t.impressions),
  linkCtr: (t: Totals) => div(t.linkClicks, t.impressions),
  cpc: (t: Totals) => div(t.spend, t.clicks),
  cplc: (t: Totals) => div(t.spend, t.linkClicks),
  cpm: (t: Totals) => div(t.spend * 1000, t.impressions),
  /** Cost per FE acquisition */
  cpa: (t: Totals) => div(t.spend, t.feSales),
  hookRate: (t: Totals) => div(t.video3sViews, t.impressions),
  holdRate: (t: Totals) => div(t.thruplays, t.video3sViews),
  totalSalesCount: (t: Totals) => t.feSales + t.beSales,
  totalRevenue: (t: Totals) => t.feRevenue + t.beRevenue,
  feRoas: (t: Totals) => div(t.feRevenue, t.spend),
  fullRoas: (t: Totals) => div(t.feRevenue + t.beRevenue, t.spend),
  profit: (t: Totals) => t.feRevenue + t.beRevenue - t.spend,
  aov: (t: Totals) =>
    div(t.feRevenue + t.beRevenue, t.feSales + t.beSales),
};

// --- Displayable metric registry (drives the column picker) ---------------

export type MetricFormat = "int" | "money" | "money2" | "pct" | "ratio";

export interface MetricDef {
  key: string;
  label: string;
  short: string;
  group: "Delivery" | "Clicks" | "Video" | "Sales" | "Efficiency";
  format: MetricFormat;
  /** Higher is better (for change coloring); false = lower is better */
  higherIsBetter: boolean;
  value: (t: Totals) => number | null;
}

export const METRICS: MetricDef[] = [
  { key: "spend", label: "Amount Spent", short: "Spend", group: "Delivery", format: "money", higherIsBetter: false, value: (t) => t.spend },
  { key: "impressions", label: "Impressions", short: "Impr.", group: "Delivery", format: "int", higherIsBetter: true, value: (t) => t.impressions },
  { key: "reach", label: "Reach", short: "Reach", group: "Delivery", format: "int", higherIsBetter: true, value: (t) => t.reach },
  { key: "cpm", label: "CPM (Cost per 1,000 Impressions)", short: "CPM", group: "Delivery", format: "money2", higherIsBetter: false, value: derived.cpm },
  { key: "clicks", label: "Clicks (All)", short: "Clicks", group: "Clicks", format: "int", higherIsBetter: true, value: (t) => t.clicks },
  { key: "ctr", label: "CTR (All)", short: "CTR", group: "Clicks", format: "pct", higherIsBetter: true, value: derived.ctr },
  { key: "linkClicks", label: "Link Clicks", short: "Link Clicks", group: "Clicks", format: "int", higherIsBetter: true, value: (t) => t.linkClicks },
  { key: "linkCtr", label: "Link CTR", short: "Link CTR", group: "Clicks", format: "pct", higherIsBetter: true, value: derived.linkCtr },
  { key: "cpc", label: "CPC (All)", short: "CPC", group: "Clicks", format: "money2", higherIsBetter: false, value: derived.cpc },
  { key: "cplc", label: "Cost per Link Click", short: "CPLC", group: "Clicks", format: "money2", higherIsBetter: false, value: derived.cplc },
  { key: "video3s", label: "3-Second Video Views", short: "3s Views", group: "Video", format: "int", higherIsBetter: true, value: (t) => t.video3sViews },
  { key: "thruplays", label: "ThruPlays", short: "ThruPlays", group: "Video", format: "int", higherIsBetter: true, value: (t) => t.thruplays },
  { key: "hookRate", label: "Hook Rate (3s Views ÷ Impressions)", short: "Hook Rate", group: "Video", format: "pct", higherIsBetter: true, value: derived.hookRate },
  { key: "holdRate", label: "Hold Rate (ThruPlays ÷ 3s Views)", short: "Hold Rate", group: "Video", format: "pct", higherIsBetter: true, value: derived.holdRate },
  { key: "feSales", label: "FE Sales", short: "FE Sales", group: "Sales", format: "int", higherIsBetter: true, value: (t) => t.feSales },
  { key: "feRevenue", label: "FE Revenue", short: "FE Rev", group: "Sales", format: "money", higherIsBetter: true, value: (t) => t.feRevenue },
  { key: "beSales", label: "BE Sales (2nd payment+, any kind)", short: "BE Sales", group: "Sales", format: "int", higherIsBetter: true, value: (t) => t.beSales },
  { key: "beRevenue", label: "BE Revenue", short: "BE Rev", group: "Sales", format: "money", higherIsBetter: true, value: (t) => t.beRevenue },
  { key: "totalSales", label: "Total Sales", short: "Sales", group: "Sales", format: "int", higherIsBetter: true, value: derived.totalSalesCount },
  { key: "totalRevenue", label: "Total Revenue (FE + BE)", short: "Total Rev", group: "Sales", format: "money", higherIsBetter: true, value: derived.totalRevenue },
  { key: "cpa", label: "CPA (Cost per FE Sale)", short: "CPA", group: "Efficiency", format: "money2", higherIsBetter: false, value: derived.cpa },
  { key: "feRoas", label: "FE ROAS", short: "FE ROAS", group: "Efficiency", format: "ratio", higherIsBetter: true, value: derived.feRoas },
  { key: "fullRoas", label: "Full ROAS (incl. BE)", short: "Full ROAS", group: "Efficiency", format: "ratio", higherIsBetter: true, value: derived.fullRoas },
  { key: "profit", label: "Profit / Loss (Total Rev − Spend)", short: "P/L", group: "Efficiency", format: "money", higherIsBetter: true, value: derived.profit },
  { key: "aov", label: "Average Order Value", short: "AOV", group: "Efficiency", format: "money2", higherIsBetter: true, value: derived.aov },
];

export const METRIC_BY_KEY = new Map(METRICS.map((m) => [m.key, m]));

export const DEFAULT_COLUMNS = [
  "spend", "impressions", "ctr", "cpc", "cpa", "feSales", "feRevenue", "beRevenue", "fullRoas", "profit",
];

// --- Formatting ------------------------------------------------------------

export function formatMetric(v: number | null, format: MetricFormat): string {
  if (v === null || Number.isNaN(v)) return "—";
  switch (format) {
    case "int":
      return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
    case "money":
      return (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
    case "money2":
      return (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case "pct":
      return (v * 100).toFixed(2) + "%";
    case "ratio":
      return v.toFixed(2) + "x";
  }
}

/** % change between two values; null if base is 0/null */
export function pctChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

// --- Filtering helpers -----------------------------------------------------

export function rowsInRange(rows: AdDailyMetrics[], range: DateRange): AdDailyMetrics[] {
  return rows.filter((r) => r.date >= range.from && r.date <= range.to);
}
export function salesInRange(sales: Sale[], range: DateRange): Sale[] {
  return sales.filter((s) => s.date >= range.from && s.date <= range.to);
}
