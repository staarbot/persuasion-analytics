"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Ad, AdDailyMetrics, CopyAsset, CreativeAsset, Sale } from "@/lib/types";
import { adLabel } from "@/lib/types";
import {
  DEFAULT_COLUMNS,
  METRICS,
  METRIC_BY_KEY,
  aggregate,
  formatMetric,
  type Totals,
} from "@/lib/metrics";

interface Props {
  ads: Ad[];
  copyAssets: CopyAsset[];
  creativeAssets: CreativeAsset[];
  rangeRows: AdDailyMetrics[];
  rangeSales: Sale[];
}

const COLUMN_PRESETS: { name: string; keys: string[] }[] = [
  { name: "Default", keys: DEFAULT_COLUMNS },
  { name: "Clicks Deep-Dive", keys: ["spend", "impressions", "clicks", "ctr", "linkClicks", "linkCtr", "cpc", "cplc"] },
  { name: "Video Engagement", keys: ["spend", "impressions", "video3s", "hookRate", "thruplays", "holdRate", "ctr", "cpa"] },
  { name: "Money", keys: ["spend", "feSales", "feRevenue", "beSales", "beRevenue", "totalRevenue", "cpa", "feRoas", "fullRoas", "profit"] },
];

const STORAGE_KEY = "pa.columns.v1";

export default function AdsTable({ ads, copyAssets, creativeAssets, rangeRows, rangeSales }: Props) {
  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string>("spend");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Restore saved column selection
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const keys = (JSON.parse(saved) as string[]).filter((k) => METRIC_BY_KEY.has(k));
        if (keys.length) setColumns(keys);
      }
    } catch {}
  }, []);
  const applyColumns = (keys: string[]) => {
    setColumns(keys);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    } catch {}
  };

  useEffect(() => {
    if (!pickerOpen) return;
    const close = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [pickerOpen]);

  const copyById = useMemo(() => new Map(copyAssets.map((c) => [c.id, c])), [copyAssets]);
  const creativeById = useMemo(() => new Map(creativeAssets.map((c) => [c.id, c])), [creativeAssets]);

  // Per-ad totals over the selected range
  const perAd = useMemo(() => {
    const rowsByAd = new Map<string, AdDailyMetrics[]>();
    for (const r of rangeRows) {
      const list = rowsByAd.get(r.adId);
      if (list) list.push(r);
      else rowsByAd.set(r.adId, [r]);
    }
    const salesByAd = new Map<string, Sale[]>();
    for (const s of rangeSales) {
      if (!s.adId) continue;
      const list = salesByAd.get(s.adId);
      if (list) list.push(s);
      else salesByAd.set(s.adId, [s]);
    }
    const out = new Map<string, Totals>();
    for (const ad of ads) {
      out.set(ad.id, aggregate(rowsByAd.get(ad.id) ?? [], salesByAd.get(ad.id) ?? []));
    }
    return out;
  }, [ads, rangeRows, rangeSales]);

  const grandTotals = useMemo(
    () => aggregate(rangeRows, rangeSales.filter((s) => s.adId)),
    [rangeRows, rangeSales]
  );

  const activeAds = useMemo(() => {
    const withData = ads.filter((ad) => (perAd.get(ad.id)?.impressions ?? 0) > 0);
    const def = METRIC_BY_KEY.get(sortKey);
    if (!def) return withData;
    return [...withData].sort((a, b) => {
      const av = def.value(perAd.get(a.id)!) ?? -Infinity;
      const bv = def.value(perAd.get(b.id)!) ?? -Infinity;
      return (av - bv) * sortDir;
    });
  }, [ads, perAd, sortKey, sortDir]);

  const visibleMetrics = columns.map((k) => METRIC_BY_KEY.get(k)!).filter(Boolean);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="label-caps">
          Ads · {activeAds.length} with delivery in range
        </h2>
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setPickerOpen((o) => !o)}
            className="bg-cream-100 border border-ink-800/12 rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-cream-300 transition-colors"
          >
            Columns · {columns.length}
          </button>
          {pickerOpen && (
            <div className="absolute top-full right-0 mt-1 bg-cream-100 border border-ink-800/12 rounded-lg shadow-lg p-4 z-50 w-[520px]">
              <div className="flex gap-2 mb-3 flex-wrap">
                {COLUMN_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => applyColumns(p.keys)}
                    className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider border border-ink-800/12 rounded hover:bg-cream-300 transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-x-6 max-h-[320px] overflow-y-auto">
                {(["Delivery", "Clicks", "Video", "Sales", "Efficiency"] as const).map((group) => (
                  <div key={group} className="mb-3 break-inside-avoid">
                    <div className="label-caps mb-1.5">{group}</div>
                    {METRICS.filter((m) => m.group === group).map((m) => (
                      <label key={m.key} className="flex items-center gap-2 py-0.5 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={columns.includes(m.key)}
                          onChange={(e) =>
                            applyColumns(
                              e.target.checked
                                ? [...columns, m.key]
                                : columns.filter((k) => k !== m.key)
                            )
                          }
                          className="rounded border-ink-800/20 accent-gold-500"
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-cream-100 border border-ink-800/12 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-ink-800/12">
              <th className="text-left py-2.5 px-3 label-caps sticky left-0 bg-cream-100">Ad</th>
              <th className="text-left py-2.5 px-3 label-caps">Assets</th>
              <th className="text-left py-2.5 px-3 label-caps">Ad Set</th>
              {visibleMetrics.map((m) => (
                <th
                  key={m.key}
                  className="text-right py-2.5 px-3 label-caps cursor-pointer select-none hover:text-ink-800 whitespace-nowrap"
                  onClick={() => {
                    if (sortKey === m.key) setSortDir((d) => (d === 1 ? -1 : 1));
                    else {
                      setSortKey(m.key);
                      setSortDir(-1);
                    }
                  }}
                  title={m.label}
                >
                  {m.short}
                  {sortKey === m.key ? (sortDir === -1 ? " ↓" : " ↑") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeAds.map((ad) => {
              const creative = creativeById.get(ad.creativeAssetId);
              const copy = copyById.get(ad.copyAssetId);
              const t = perAd.get(ad.id)!;
              return (
                <tr key={ad.id} className="border-b border-ink-800/8 hover:bg-cream-350 transition-colors">
                  <td className="py-2.5 px-3 sticky left-0 bg-cream-100">
                    <div className="font-num text-[13px] font-medium text-ink-900 whitespace-nowrap">
                      {adLabel(ad, creative, copy)}
                    </div>
                    <div className="text-[11px] text-taupe-500">
                      {ad.status === "active" ? (
                        <span className="text-signal-green">● active</span>
                      ) : (
                        <span>◦ {ad.status}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className="code-chip mr-1"
                      style={{
                        backgroundColor: creative?.type === "video" ? "#4A78D822" : "#C4922A22",
                        color: creative?.type === "video" ? "#3757A8" : "#8A6414",
                      }}
                      title={creative?.name}
                    >
                      {creative?.code}
                    </span>
                    <span
                      className="code-chip"
                      style={{ backgroundColor: "#8E33B31c", color: "#71288F" }}
                      title={copy?.name}
                    >
                      {copy?.code}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-taupe-600 whitespace-nowrap">{ad.adSetName}</td>
                  {visibleMetrics.map((m) => (
                    <td key={m.key} className="py-2.5 px-3 text-right font-num text-[13px] whitespace-nowrap">
                      {formatMetric(m.value(t), m.format)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-cream-300/60">
              <td className="py-3 px-3 label-caps sticky left-0 bg-cream-300" colSpan={3}>
                Totals · attributed only
              </td>
              {visibleMetrics.map((m) => (
                <td key={m.key} className="py-3 px-3 text-right font-num text-[13px] font-medium whitespace-nowrap">
                  {formatMetric(m.value(grandTotals), m.format)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-[11px] text-taupe-500 mt-2">
        Sales columns count Stripe transactions attributed to each ad; unattributed sales appear in the
        page-level tiles but not in per-ad rows. Click any column header to sort.
      </p>
    </section>
  );
}
