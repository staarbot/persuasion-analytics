// Cohort bucketing: slice a date range into calendar-aligned week / month /
// quarter buckets and aggregate each, plus the day-of-week breakdown.

import type { AdDailyMetrics, Sale } from "@/lib/types";
import type { DateRange } from "@/lib/providers/types";
import { addDays, monthEnd, monthStart, parse, quarterStart, weekStart } from "@/lib/dates";
import { aggregate, type Totals } from "@/lib/metrics";

export type BucketUnit = "week" | "month" | "quarter";

/** Calendar-aligned start of the bucket containing d */
export function bucketStart(d: string, unit: BucketUnit): string {
  if (unit === "week") return weekStart(d);
  if (unit === "month") return monthStart(d);
  return quarterStart(d);
}

function bucketEnd(start: string, unit: BucketUnit): string {
  if (unit === "week") return addDays(start, 6);
  if (unit === "month") return monthEnd(start);
  const q = parse(start);
  const nextQ = new Date(Date.UTC(q.getUTCFullYear(), q.getUTCMonth() + 3, 1));
  return addDays(nextQ.toISOString().slice(0, 10), -1);
}

export function bucketLabel(start: string, unit: BucketUnit): string {
  const d = parse(start);
  if (unit === "week") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  }
  if (unit === "month") {
    const mon = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    return `${mon} '${String(d.getUTCFullYear()).slice(2)}`;
  }
  return `Q${Math.floor(d.getUTCMonth() / 3) + 1} '${String(d.getUTCFullYear()).slice(2)}`;
}

export interface Bucket {
  start: string;
  range: DateRange; // clipped to the selected range
  label: string;
  /** True when the selected range only partially covers this calendar bucket */
  partial: boolean;
  totals: Totals;
}

export function computeBuckets(
  rows: AdDailyMetrics[],
  sales: Sale[],
  range: DateRange,
  unit: BucketUnit
): Bucket[] {
  // Single pass: group rows and sales by bucket start
  const rowsBy = new Map<string, AdDailyMetrics[]>();
  for (const r of rows) {
    if (r.date < range.from || r.date > range.to) continue;
    const k = bucketStart(r.date, unit);
    const list = rowsBy.get(k);
    if (list) list.push(r);
    else rowsBy.set(k, [r]);
  }
  const salesBy = new Map<string, Sale[]>();
  for (const s of sales) {
    if (s.date < range.from || s.date > range.to) continue;
    const k = bucketStart(s.date, unit);
    const list = salesBy.get(k);
    if (list) list.push(s);
    else salesBy.set(k, [s]);
  }

  // Walk calendar buckets across the range so empty buckets still appear
  const out: Bucket[] = [];
  let cursor = bucketStart(range.from, unit);
  while (cursor <= range.to) {
    const calEnd = bucketEnd(cursor, unit);
    const clipped: DateRange = {
      from: cursor < range.from ? range.from : cursor,
      to: calEnd > range.to ? range.to : calEnd,
    };
    out.push({
      start: cursor,
      range: clipped,
      label: bucketLabel(cursor, unit),
      partial: clipped.from !== cursor || clipped.to !== calEnd,
      totals: aggregate(rowsBy.get(cursor) ?? [], salesBy.get(cursor) ?? []),
    });
    cursor = addDays(calEnd, 1);
  }
  return out;
}

// --- Day-of-week breakdown -------------------------------------------------

export const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Totals per day of week (Mon-first) over the range */
export function dayOfWeekTotals(
  rows: AdDailyMetrics[],
  sales: Sale[],
  range: DateRange
): Totals[] {
  const rowsBy: AdDailyMetrics[][] = [[], [], [], [], [], [], []];
  const salesBy: Sale[][] = [[], [], [], [], [], [], []];
  const dowOf = (d: string) => (parse(d).getUTCDay() + 6) % 7; // Mon=0
  for (const r of rows) {
    if (r.date >= range.from && r.date <= range.to) rowsBy[dowOf(r.date)].push(r);
  }
  for (const s of sales) {
    if (s.date >= range.from && s.date <= range.to) salesBy[dowOf(s.date)].push(s);
  }
  return rowsBy.map((list, i) => aggregate(list, salesBy[i]));
}
