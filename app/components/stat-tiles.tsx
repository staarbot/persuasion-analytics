"use client";

import type { Sale } from "@/lib/types";
import type { Totals } from "@/lib/metrics";
import { derived, formatMetric, salesInRange } from "@/lib/metrics";
import {
  lastFullMonth,
  lastFullWeek,
  thisMonthToDate,
  thisWeekToDate,
} from "@/lib/dates";

interface Props {
  totals: Totals; // over the selected range
  sales: Sale[]; // full dataset — the sales tiles are fixed windows
  dataEnd: string;
}

function countSales(sales: Sale[]) {
  return sales.length;
}

export default function StatTiles({ totals, sales, dataEnd }: Props) {
  // Fixed-window sales tiles (independent of the selected range, like the CSV)
  const tiles = [
    { label: "Sales This Week", value: countSales(salesInRange(sales, thisWeekToDate(dataEnd))), format: "int" as const },
    { label: "Sales Last Week", value: countSales(salesInRange(sales, lastFullWeek(dataEnd))), format: "int" as const },
    { label: "Sales This Month", value: countSales(salesInRange(sales, thisMonthToDate(dataEnd))), format: "int" as const },
    { label: "Sales Last Month", value: countSales(salesInRange(sales, lastFullMonth(dataEnd))), format: "int" as const },
  ];

  const profit = derived.profit(totals);

  // Selected-range money tiles
  const rangeTiles = [
    { label: "Total Spend", value: formatMetric(totals.spend, "money"), tone: "neutral" },
    { label: "FE Revenue", value: formatMetric(totals.feRevenue, "money"), tone: "neutral" },
    { label: "BE Revenue (2nd pmt+)", value: formatMetric(totals.beRevenue, "money"), tone: "neutral" },
    {
      label: profit >= 0 ? "Total Profit" : "Total Loss",
      value: formatMetric(profit, "money"),
      tone: profit >= 0 ? "good" : "bad",
    },
  ];

  return (
    <section>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        {tiles.map((t) => (
          <div key={t.label} className="bg-cream-300 rounded-lg p-5 border border-ink-800/8">
            <div className="label-caps mb-2">{t.label}</div>
            <div className="font-num text-2xl font-medium text-ink-900">
              {formatMetric(t.value, t.format)}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {rangeTiles.map((t) => (
          <div key={t.label} className="bg-cream-100 rounded-lg p-5 border border-ink-800/12">
            <div className="label-caps mb-2">{t.label}</div>
            <div
              className={`font-num text-2xl font-medium ${
                t.tone === "good"
                  ? "text-signal-green"
                  : t.tone === "bad"
                    ? "text-signal-red"
                    : "text-ink-900"
              }`}
            >
              {t.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
