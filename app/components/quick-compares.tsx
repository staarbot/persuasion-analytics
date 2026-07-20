"use client";

import type { AdDailyMetrics, Sale } from "@/lib/types";
import {
  aggregate,
  derived,
  formatMetric,
  pctChange,
  rowsInRange,
  salesInRange,
} from "@/lib/metrics";
import {
  fmtRange,
  lastFullMonth,
  lastFullQuarter,
  lastFullWeek,
  previousFullMonth,
  previousFullQuarter,
  previousFullWeek,
} from "@/lib/dates";

interface Props {
  dailyMetrics: AdDailyMetrics[];
  sales: Sale[];
  dataEnd: string;
}

// The compare metrics shown in each period card
const COMPARE_METRICS = [
  { key: "spend", label: "Spend", higherIsBetter: false },
  { key: "totalSales", label: "Sales", higherIsBetter: true },
  { key: "cpa", label: "CPA", higherIsBetter: false },
  { key: "fullRoas", label: "Full ROAS", higherIsBetter: true },
] as const;

export default function QuickCompares({ dailyMetrics, sales, dataEnd }: Props) {
  const periods = [
    {
      title: "Week over Week",
      note: "Last full week vs. the full week before it",
      current: lastFullWeek(dataEnd),
      previous: previousFullWeek(dataEnd),
    },
    {
      title: "Month over Month",
      note: "Last full month vs. the full month before it",
      current: lastFullMonth(dataEnd),
      previous: previousFullMonth(dataEnd),
    },
    {
      title: "Quarter over Quarter",
      note: "Last full quarter vs. the full quarter before it",
      current: lastFullQuarter(dataEnd),
      previous: previousFullQuarter(dataEnd),
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
          const values = {
            spend: { c: cur.spend, p: prev.spend, fmt: "money" as const },
            totalSales: { c: derived.totalSalesCount(cur), p: derived.totalSalesCount(prev), fmt: "int" as const },
            cpa: { c: derived.cpa(cur), p: derived.cpa(prev), fmt: "money2" as const },
            fullRoas: { c: derived.fullRoas(cur), p: derived.fullRoas(prev), fmt: "ratio" as const },
          };
          return (
            <div key={p.title} className="bg-cream-100 border border-ink-800/12 rounded-lg p-5">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-base font-semibold text-ink-900" style={{ fontFamily: "var(--font-display)" }}>
                  {p.title}
                </h3>
              </div>
              <p className="text-[11px] text-taupe-500 mb-4">
                {fmtRange(p.current)} <span className="text-taupe-400">vs.</span> {fmtRange(p.previous)}
              </p>
              <div className="space-y-2.5">
                {COMPARE_METRICS.map((m) => {
                  const v = values[m.key];
                  const change = pctChange(v.c, v.p);
                  const good =
                    change === null ? null : m.higherIsBetter ? change >= 0 : change <= 0;
                  return (
                    <div key={m.key} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-taupe-600 w-20">{m.label}</span>
                      <span className="font-num text-sm text-ink-900 flex-1 text-right">
                        {formatMetric(v.c, v.fmt)}
                      </span>
                      <span
                        className={`font-num text-xs w-16 text-right ${
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
