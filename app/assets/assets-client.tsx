"use client";

import { useMemo, useState } from "react";
import type { Ad, AdDailyMetrics, CopyAsset, CreativeAsset, Sale } from "@/lib/types";
import { PRESETS, fmtRange } from "@/lib/dates";
import { derived, formatMetric, type Totals } from "@/lib/metrics";
import { rollupAssets, type AssetPerf } from "@/lib/assets";
import { useAssetOverrides } from "@/lib/use-asset-overrides";
import DateRangeControl from "../components/date-range-control";
import type { RangeSelection } from "../dashboard-client";
import PairingMatrix from "./pairing-matrix";
import AssetDrawer, { type DrawerTarget } from "./asset-drawer";

interface Props {
  ads: Ad[];
  copyAssets: CopyAsset[];
  creativeAssets: CreativeAsset[];
  dailyMetrics: AdDailyMetrics[];
  sales: Sale[];
  dataStart: string;
  dataEnd: string;
}

const TABLE_COLS: {
  key: string;
  label: string;
  value: (p: AssetPerf) => string;
  sort: (p: AssetPerf) => number;
}[] = [
  { key: "ads", label: "Ads", value: (p) => String(p.adIds.length), sort: (p) => p.adIds.length },
  { key: "partners", label: "Paired With", value: (p) => String(p.partnerIds.length), sort: (p) => p.partnerIds.length },
  { key: "spend", label: "Spend", value: (p) => formatMetric(p.totals.spend, "money"), sort: (p) => p.totals.spend },
  { key: "ctr", label: "CTR", value: (p) => formatMetric(derived.ctr(p.totals), "pct"), sort: (p) => derived.ctr(p.totals) ?? -1 },
  { key: "cpa", label: "CPA", value: (p) => formatMetric(derived.cpa(p.totals), "money2"), sort: (p) => derived.cpa(p.totals) ?? -1 },
  { key: "roas", label: "Full ROAS", value: (p) => formatMetric(derived.fullRoas(p.totals), "ratio"), sort: (p) => derived.fullRoas(p.totals) ?? -1 },
  { key: "profit", label: "P/L", value: (p) => formatMetric(derived.profit(p.totals), "money"), sort: (p) => derived.profit(p.totals) },
];

export default function AssetsClient({
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
  const [drawer, setDrawer] = useState<DrawerTarget | null>(null);
  const { overrides, saveOverride } = useAssetOverrides();

  const rollup = useMemo(
    () => rollupAssets(ads, dailyMetrics, sales, selection.range),
    [ads, dailyMetrics, sales, selection.range]
  );

  const displayName = (a: CopyAsset | CreativeAsset) => overrides[a.id]?.name ?? a.name;
  const hasNotes = (a: CopyAsset | CreativeAsset) =>
    Boolean(overrides[a.id]?.notes ?? a.notes) ||
    Boolean(overrides[a.id]?.description ?? a.description);

  const assetTable = (
    title: string,
    subtitle: string,
    assets: (CopyAsset | CreativeAsset)[],
    perfMap: Map<string, AssetPerf>,
    kind: "copy" | "creative"
  ) => {
    const withData = assets
      .filter((a) => perfMap.has(a.id))
      .sort((a, b) => (perfMap.get(b.id)?.totals.spend ?? 0) - (perfMap.get(a.id)?.totals.spend ?? 0));
    return (
      <div className="bg-cream-100 border border-ink-800/12 rounded-lg overflow-x-auto flex-1 min-w-[420px]">
        <div className="px-4 pt-4 pb-2 flex items-baseline justify-between">
          <h3 className="text-base font-semibold text-ink-900" style={{ fontFamily: "var(--font-display)" }}>
            {title}
          </h3>
          <span className="text-[11px] text-taupe-500">{subtitle}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-800/12">
              <th className="text-left py-2 px-4 label-caps">Asset</th>
              {TABLE_COLS.map((c) => (
                <th key={c.key} className="text-right py-2 px-2 label-caps whitespace-nowrap">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {withData.map((a) => {
              const p = perfMap.get(a.id)!;
              return (
                <tr
                  key={a.id}
                  className="border-b border-ink-800/8 hover:bg-cream-350 transition-colors cursor-pointer"
                  onClick={() =>
                    setDrawer(
                      kind === "copy"
                        ? { kind: "copy", asset: a as CopyAsset }
                        : { kind: "creative", asset: a as CreativeAsset }
                    )
                  }
                >
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="code-chip"
                        style={
                          kind === "copy"
                            ? { backgroundColor: "#8E33B31c", color: "#71288F" }
                            : (a as CreativeAsset).type === "video"
                              ? { backgroundColor: "#4A78D822", color: "#3757A8" }
                              : { backgroundColor: "#C4922A22", color: "#8A6414" }
                        }
                      >
                        {a.code}
                      </span>
                      <span className="text-[13px] text-ink-800">{displayName(a)}</span>
                      {hasNotes(a) && (
                        <span className="text-[10px] text-taupe-400" title="Has description/notes">✎</span>
                      )}
                    </div>
                  </td>
                  {TABLE_COLS.map((c) => (
                    <td key={c.key} className="py-2 px-2 text-right font-num text-[13px] whitespace-nowrap">
                      {c.value(p)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const drawerPerf: AssetPerf | undefined = drawer
    ? (drawer.kind === "copy" ? rollup.byCopy : rollup.byCreative).get(drawer.asset.id)
    : undefined;

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-semibold text-ink-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Assets
          </h1>
          <p className="text-sm text-taupe-600 mt-1">
            Copy &amp; creative performance across every ad · {fmtRange(selection.range)}
          </p>
        </div>
        <DateRangeControl
          selection={selection}
          onChange={setSelection}
          dataStart={dataStart}
          dataEnd={dataEnd}
        />
      </div>

      <section className="flex gap-3 flex-wrap">
        {assetTable(
          "Copy Assets",
          "click a row to view & edit",
          copyAssets,
          rollup.byCopy,
          "copy"
        )}
        {assetTable(
          "Creative Assets",
          "click a row to view & edit",
          creativeAssets,
          rollup.byCreative,
          "creative"
        )}
      </section>

      <PairingMatrix
        copyAssets={copyAssets}
        creativeAssets={creativeAssets}
        pairings={rollup.pairings}
      />

      {drawer && (
        <AssetDrawer
          target={drawer}
          override={overrides[drawer.asset.id]}
          perf={drawerPerf}
          ads={ads}
          copyAssets={copyAssets}
          creativeAssets={creativeAssets}
          perAd={rollup.perAd}
          onSave={saveOverride}
          onClose={() => setDrawer(null)}
        />
      )}
    </main>
  );
}
