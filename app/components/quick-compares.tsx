"use client";

import type { AdDailyMetrics, Sale } from "@/lib/types";
import {
  aggregate,
  derived,
  formatMetric,
  pctChange,
  rowsInRange,
  salesInRange,
  type MetricFormat,
} from "@/lib/metrics";
import {
  lastFullMonth,
  lastFullQuarter,
  lastFullWeek,
  parse,
  previousFullMonth,
  previousFullQuarter,
  previousFullWeek,
} from "@/lib/dates";
import type { DateRange } from "@/lib/providers/types";

interface Props {
  dailyMetrics: AdDailyMetrics[];
  sales: Sale[];
  dataEnd: string;
}

// The compare metrics shown in each period card
const COMPARE_METRICS = [
  { key: "spend", label: "Spend", higherIsBetter: false, fmt: "money" as MetricFormat },
  { key: "totalSales", label: "Sales", higherIsBetter: true, fmt: "int" as MetricFormat },
  { key: "cpa", label: "CPA", higherIsBetter: false, fmt: "money2" as MetricFormat },
  { key: "fullRoas", label: "Full ROAS", higherIsBetter: true, fmt: "ratio" as MetricFormat },
] as const;

// --- Tight period labels for column headers -------------------------------

/** "Jul 6–12" or "Jun 29 – Jul 5" when the week crosses months */
function weekLabel(r: DateRange): string {
  const f = parse(r.from);
  const t = parse(r.to);
  const mon = (d: Date) => d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  if (f.getUTCMonth() === t.getUTCMonth()) {
    return `${mon(f)} ${f.getUTCDate()}–${t.getUTCDate()}`;
  }
  return `${mon(f)} ${f.getUTCDate()} – ${mon(t)} ${t.getUTCDate()}`;
}

/** "Jun '26" */
function monthLabel(r: DateRange): string {
  const d = parse(r.from);
  const mon = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  return `${mon} '${String(d.getUTCFullYear()).slice(2)}`;
}

/** "Q2 '26" */
function quarterLabel(r: DateRange): string {
  const d = parse(r.from);
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `Q${q} '${String(d.getUTCFullYear()).slice(2)}`;
}

export default function QuickCompares({ dailyMetrics, sales, dataEnd }: Props) {
  const periods = [
    {
      title: "Week over Week",
      current: lastFullWeek(dataEnd),
      previous: previousFullWeek(dataEnd),
      label: weekLabel,
    },
    {
      title: "Month over Month",
      current: lastFullMonth(dataEnd),
      previous: previousFullMonth(dataEnd),
      label: monthLabel,
    },
    {
      title: "Quarter over Quarter",
      current: lastFullQuarter(dataEnd),
      previous: previousFullQuarter(dataEnd),
      label: quarterLabel,
    },
  ];

  return (
    <section>
      <h2 className="label-caps mb-3">Quick Compares · Full Periods Only</h2>
      <div className="grid md:grid-cols-3 gap-3">
        {periods.map((p) => {
          const cur = aggregate(
            rowsInRange(dailyMetrics, p.current),
            salesInRange(sales, p.current)
          );
          const prev = aggregate(
            rowsInRange(dailyMetrics, p.previous),
            salesInRange(sales, p.previous)
          );
          const values: Record<string, { c: number | null; p: number | null }> = {
            spend: { c: cur.spend, p: prev.spend },
            totalSales: { c: derived.totalSalesCount(cur), p: derived.totalSalesCount(prev) },
            cpa: { c: derived.cpa(cur), p: derived.cpa(prev) },
            fullRoas: { c: derived.fullRoas(cur), p: derived.fullRoas(prev) },
          };
          return (
            <div key={p.title} className="bg-cream-100 border border-ink-800/12 rounded-lg p-5">
              <h3
                className="text-base font-semibold text-ink-900 mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {p.title}
              </h3>
              {/* One grid for header + all rows so the value columns share
                  track sizing — per-row grids would let short numbers drift */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-2.5 items-baseline">
                <span className="border-b border-ink-800/12 pb-1.5" />
                <span className="label-caps !text-[10px] text-right whitespace-nowrap border-b border-ink-800/12 pb-1.5">
                  {p.label(p.previous)}
                </span>
                <span className="label-caps !text-[10px] !text-ink-800 text-right whitespace-nowrap border-b border-ink-800/12 pb-1.5">
                  {p.label(p.current)}
                </span>
                <span className="label-caps !text-[10px] text-right border-b border-ink-800/12 pb-1.5">
                  ±%
                </span>
                {COMPARE_METRICS.map((m) => {
                  const v = values[m.key];
                  const change = pctChange(v.c, v.p);
                  const good =
                    change === null ? null : m.higherIsBetter ? change >= 0 : change <= 0;
                  return (
                    <div key={m.key} className="contents">
                      <span className="text-xs text-taupe-600">{m.label}</span>
                      <span className="font-num text-[13px] text-taupe-500 text-right whitespace-nowrap">
                        {formatMetric(v.p, m.fmt)}
                      </span>
                      <span className="font-num text-[13px] font-medium text-ink-900 text-right whitespace-nowrap">
                        {formatMetric(v.c, m.fmt)}
                      </span>
                      <span
                        className={`font-num text-xs text-right ${
                          change === null
                            ? "text-taupe-400"
                            : good
                              ? "text-signal-green"
                              : "text-signal-red"
                        }`}
                      >
                        {change === null
                          ? "—"
                          : `${change >= 0 ? "+" : ""}${(change * 100).toFixed(1)}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
