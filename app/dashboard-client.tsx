"use client";

import { useMemo, useState } from "react";
import type { Ad, AdDailyMetrics, CopyAsset, CreativeAsset, Sale } from "@/lib/types";
import type { DateRange } from "@/lib/providers/types";
import { PRESETS, fmtRange } from "@/lib/dates";
import { aggregate, rowsInRange, salesInRange } from "@/lib/metrics";
import DateRangeControl from "./components/date-range-control";
import StatTiles from "./components/stat-tiles";
import QuickCompares from "./components/quick-compares";
import AdsTable from "./components/ads-table";

interface Props {
  ads: Ad[];
  copyAssets: CopyAsset[];
  creativeAssets: CreativeAsset[];
  dailyMetrics: AdDailyMetrics[];
  sales: Sale[];
  dataStart: string;
  dataEnd: string;
}

export interface RangeSelection {
  presetKey: string | null; // null = custom
  range: DateRange;
}

export default function DashboardClient({
  ads,
  copyAssets,
  creativeAssets,
  dailyMetrics,
  sales,
  dataStart,
  dataEnd,
}: Props) {
  const [selection, setSelection] = useState<RangeSelection>(() => {
    const lifetime = PRESETS.find((p) => p.key === "lifetime")!;
    return { presetKey: "lifetime", range: lifetime.range(dataEnd, dataStart) };
  });

  const rangeRows = useMemo(
    () => rowsInRange(dailyMetrics, selection.range),
    [dailyMetrics, selection.range]
  );
  const rangeSales = useMemo(
    () => salesInRange(sales, selection.range),
    [sales, selection.range]
  );
  const totals = useMemo(
    () => aggregate(rangeRows, rangeSales),
    [rangeRows, rangeSales]
  );

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-semibold text-ink-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Performance
          </h1>
          <p className="text-sm text-taupe-600 mt-1">
            Totals over <span className="font-medium text-ink-800">{fmtRange(selection.range)}</span>
            {" · "}revenue source:{" "}
            <span className="font-medium text-ink-800 uppercase text-xs tracking-wider">
              {totals.revenueSource === "none" ? "no sales in range" : totals.revenueSource.replace("_", "-")}
            </span>
          </p>
        </div>
        <DateRangeControl
          selection={selection}
          onChange={setSelection}
          dataStart={dataStart}
          dataEnd={dataEnd}
        />
      </div>

      <StatTiles totals={totals} sales={sales} dataEnd={dataEnd} />

      <QuickCompares dailyMetrics={dailyMetrics} sales={sales} dataEnd={dataEnd} />

      <AdsTable
        ads={ads}
        copyAssets={copyAssets}
        creativeAssets={creativeAssets}
        rangeRows={rangeRows}
        rangeSales={rangeSales}
      />
    </main>
  );
}
