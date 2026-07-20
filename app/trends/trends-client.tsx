"use client";

import { useMemo, useState } from "react";
import type { AdDailyMetrics, Sale } from "@/lib/types";
import { PRESETS, fmtRange } from "@/lib/dates";
import {
  derived,
  formatMetric,
  pctChange,
  type MetricFormat,
  type Totals,
} from "@/lib/metrics";
import {
  DOW_LABELS,
  computeBuckets,
  dayOfWeekTotals,
  type BucketUnit,
} from "@/lib/buckets";
import DateRangeControl from "../components/date-range-control";
import type { RangeSelection } from "../dashboard-client";
import BarChart from "../components/charts";

interface Props {
  dailyMetrics: AdDailyMetrics[];
  sales: Sale[];
  dataStart: string;
  dataEnd: string;
}

// Validated series colors (dataviz palette check, cream surface)
const GOLD = "#8A6414";
const BLUE = "#4A78D8";

const BUCKET_UNITS: { key: BucketUnit; label: string }[] = [
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
  { key: "quarter", label: "Quarterly" },
];

// Metrics offered in the day-of-week section
const DOW_METRICS: {
  key: string;
  label: string;
  fmt: MetricFormat;
  value: (t: Totals) => number | null;
}[] = [
  { key: "spend", label: "Spend", fmt: "money", value: (t) => t.spend },
  { key: "sales", label: "Sales", fmt: "int", value: derived.totalSalesCount },
  { key: "revenue", label: "Revenue", fmt: "money", value: derived.totalRevenue },
  { key: "cpa", label: "CPA", fmt: "money2", value: derived.cpa },
  { key: "fullRoas", label: "Full ROAS", fmt: "ratio", value: derived.fullRoas },
  { key: "ctr", label: "CTR", fmt: "pct", value: derived.ctr },
];

export default function TrendsClient({ dailyMetrics, sales, dataStart, dataEnd }: Props) {
  const [selection, setSelection] = useState<RangeSelection>(() => {
    const lifetime = PRESETS.find((p) => p.key === "lifetime")!;
    return { presetKey: "lifetime", range: lifetime.range(dataEnd, dataStart) };
  });
  const [unit, setUnit] = useState<BucketUnit>("month");
  const [dowMetric, setDowMetric] = useState("spend");

  const buckets = useMemo(
    () => computeBuckets(dailyMetrics, sales, selection.range, unit),
    [dailyMetrics, sales, selection.range, unit]
  );
  const dow = useMemo(
    () => dayOfWeekTotals(dailyMetrics, sales, selection.range),
    [dailyMetrics, sales, selection.range]
  );

  const labels = buckets.map((b) => b.label);
  const partials = buckets.map((b) => b.partial);
  const vals = (f: (t: Totals) => number | null) => buckets.map((b) => f(b.totals));

  const charts: {
    title: string;
    fmt: MetricFormat;
    series: { name: string; color: string; values: (number | null)[] }[];
    refLine?: number;
  }[] = [
    { title: "Spend", fmt: "money", series: [{ name: "Spend", color: GOLD, values: vals((t) => t.spend) }] },
    {
      title: "Revenue",
      fmt: "money",
      series: [
        { name: "FE", color: GOLD, values: vals((t) => t.feRevenue) },
        { name: "BE", color: BLUE, values: vals((t) => t.beRevenue) },
      ],
    },
    { title: "Sales", fmt: "int", series: [{ name: "Sales", color: GOLD, values: vals(derived.totalSalesCount) }] },
    { title: "CPA", fmt: "money2", series: [{ name: "CPA", color: GOLD, values: vals(derived.cpa) }] },
    {
      title: "Full ROAS",
      fmt: "ratio",
      refLine: 1,
      series: [{ name: "Full ROAS", color: GOLD, values: vals(derived.fullRoas) }],
    },
    { title: "CTR (All)", fmt: "pct", series: [{ name: "CTR", color: GOLD, values: vals(derived.ctr) }] },
  ];

  const dowDef = DOW_METRICS.find((m) => m.key === dowMetric)!;
  const dowValues = dow.map((t) => dowDef.value(t));
  let bestDowIdx = -1;
  for (let i = 0; i < dowValues.length; i++) {
    const v = dowValues[i];
    if (v !== null && (bestDowIdx === -1 || v > (dowValues[bestDowIdx] ?? -Infinity))) {
      bestDowIdx = i;
    }
  }
  const bestDow = bestDowIdx >= 0 ? DOW_LABELS[bestDowIdx] : null;

  // Cohort table columns
  const tableCols: {
    key: string;
    label: string;
    fmt: MetricFormat;
    value: (t: Totals) => number | null;
    higherIsBetter: boolean;
  }[] = [
    { key: "spend", label: "Spend", fmt: "money", value: (t) => t.spend, higherIsBetter: false },
    { key: "sales", label: "Sales", fmt: "int", value: derived.totalSalesCount, higherIsBetter: true },
    { key: "feRev", label: "FE Rev", fmt: "money", value: (t) => t.feRevenue, higherIsBetter: true },
    { key: "beRev", label: "BE Rev", fmt: "money", value: (t) => t.beRevenue, higherIsBetter: true },
    { key: "cpa", label: "CPA", fmt: "money2", value: derived.cpa, higherIsBetter: false },
    { key: "roas", label: "Full ROAS", fmt: "ratio", value: derived.fullRoas, higherIsBetter: true },
    { key: "profit", label: "P/L", fmt: "money", value: derived.profit, higherIsBetter: true },
  ];

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-semibold text-ink-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Trends &amp; Cohorts
          </h1>
          <p className="text-sm text-taupe-600 mt-1">
            {fmtRange(selection.range)} · bucketed{" "}
            {unit === "week" ? "weekly (Mon–Sun)" : unit === "month" ? "monthly" : "quarterly"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex border border-ink-800/12 rounded-lg overflow-hidden bg-cream-100">
            {BUCKET_UNITS.map((u) => (
              <button
                key={u.key}
                onClick={() => setUnit(u.key)}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  unit === u.key ? "bg-gold-500 text-ink-900" : "text-ink-800 hover:bg-cream-300"
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
          <DateRangeControl
            selection={selection}
            onChange={setSelection}
            dataStart={dataStart}
            dataEnd={dataEnd}
          />
        </div>
      </div>

      {/* Small multiples — one measure per chart, shared bucketing */}
      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {charts.map((c) => (
          <div key={c.title} className="bg-cream-100 border border-ink-800/12 rounded-lg p-4">
            <div className="label-caps mb-2">{c.title}</div>
            <BarChart
              labels={labels}
              series={c.series}
              format={c.fmt}
              refLine={c.refLine}
              partialFlags={partials}
            />
          </div>
        ))}
      </section>
      <p className="text-[11px] text-taupe-500 -mt-6">
        Faded bars are partial periods (the selected range covers only part of that calendar
        {" "}{unit}). Dashed line on ROAS marks 1.0x break-even.
      </p>

      {/* Day-of-week breakdown */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="label-caps">Day-of-Week Breakdown</h2>
          <div className="flex border border-ink-800/12 rounded-lg overflow-hidden bg-cream-100">
            {DOW_METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setDowMetric(m.key)}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  dowMetric === m.key ? "bg-ink-900 text-cream-200" : "text-ink-800 hover:bg-cream-300"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-cream-100 border border-ink-800/12 rounded-lg p-4">
          <BarChart
            labels={DOW_LABELS}
            series={[{ name: dowDef.label, color: GOLD, values: dowValues }]}
            format={dowDef.fmt}
            height={210}
          />
          {bestDow && (
            <p className="text-xs text-taupe-600 mt-1">
              Highest {dowDef.label.toLowerCase()}:{" "}
              <span className="font-semibold text-ink-800">{bestDow}</span> over this range.
            </p>
          )}
        </div>
      </section>

      {/* Cohort table — the full-precision view of the same buckets */}
      <section>
        <h2 className="label-caps mb-3">Cohort Table · % vs. Previous {unit}</h2>
        <div className="bg-cream-100 border border-ink-800/12 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-ink-800/12">
                <th className="text-left py-2.5 px-3 label-caps">Period</th>
                {tableCols.map((c) => (
                  <th key={c.key} className="text-right py-2.5 px-3 label-caps">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buckets.map((b, i) => {
                const prev = i > 0 ? buckets[i - 1] : null;
                return (
                  <tr key={b.start} className="border-b border-ink-800/8 hover:bg-cream-350 transition-colors">
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="font-num text-[13px] font-medium text-ink-900">{b.label}</span>
                      {b.partial && <span className="text-[10px] text-taupe-500 ml-1">partial</span>}
                    </td>
                    {tableCols.map((c) => {
                      const v = c.value(b.totals);
                      const change =
                        prev && !prev.partial && !b.partial
                          ? pctChange(v, c.value(prev.totals))
                          : null;
                      const good =
                        change === null ? null : c.higherIsBetter ? change >= 0 : change <= 0;
                      return (
                        <td key={c.key} className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="font-num text-[13px]">{formatMetric(v, c.fmt)}</div>
                          <div
                            className={`font-num text-[10px] ${
                              change === null
                                ? "text-taupe-400"
                                : good
                                  ? "text-signal-green"
                                  : "text-signal-red"
                            }`}
                          >
                            {change === null
                              ? "·"
                              : `${change >= 0 ? "+" : ""}${(change * 100).toFixed(1)}%`}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-taupe-500 mt-2">
          Change percentages compare against the previous full {unit}; partial periods show no
          comparison. BE revenue lands on its payment date, so recent periods understate the
          eventual back-end of their front-end sales.
        </p>
      </section>
    </main>
  );
}
