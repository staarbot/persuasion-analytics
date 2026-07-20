"use client";

import { useState } from "react";
import type { CopyAsset, CreativeAsset } from "@/lib/types";
import { derived, formatMetric, type MetricFormat, type Totals } from "@/lib/metrics";
import { pairKey, type PairingPerf } from "@/lib/assets";

interface Props {
  copyAssets: CopyAsset[];
  creativeAssets: CreativeAsset[];
  pairings: Map<string, PairingPerf>;
}

const MATRIX_METRICS: {
  key: string;
  label: string;
  fmt: MetricFormat;
  value: (t: Totals) => number | null;
  higherIsBetter: boolean;
}[] = [
  { key: "fullRoas", label: "Full ROAS", fmt: "ratio", value: derived.fullRoas, higherIsBetter: true },
  { key: "cpa", label: "CPA", fmt: "money2", value: derived.cpa, higherIsBetter: false },
  { key: "ctr", label: "CTR", fmt: "pct", value: derived.ctr, higherIsBetter: true },
  { key: "spend", label: "Spend", fmt: "money", value: (t) => t.spend, higherIsBetter: true },
  { key: "profit", label: "P/L", fmt: "money", value: derived.profit, higherIsBetter: true },
];

// Sequential ramp: cream-300 → gold-700 (single hue, light→dark = better).
// For lower-is-better metrics the scale position is inverted, so dark always
// reads "good" regardless of metric direction.
const LO = [0xed, 0xe6, 0xd9];
const HI = [0x8a, 0x64, 0x14];
function rampColor(t: number): string {
  const c = LO.map((lo, i) => Math.round(lo + (HI[i] - lo) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export default function PairingMatrix({ copyAssets, creativeAssets, pairings }: Props) {
  const [metricKey, setMetricKey] = useState("fullRoas");
  const [hover, setHover] = useState<string | null>(null);
  const metric = MATRIX_METRICS.find((m) => m.key === metricKey)!;

  // Only assets that actually appear in a pairing with data
  const usedCopy = copyAssets.filter((c) =>
    creativeAssets.some((cr) => pairings.has(pairKey(cr.id, c.id)))
  );
  const usedCreative = creativeAssets.filter((cr) =>
    copyAssets.some((c) => pairings.has(pairKey(cr.id, c.id)))
  );

  // Scale over present values
  const values: number[] = [];
  for (const p of pairings.values()) {
    const v = metric.value(p.totals);
    if (v !== null && Number.isFinite(v)) values.push(v);
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const scaleT = (v: number) => {
    if (max === min) return 0.5;
    const t = (v - min) / (max - min);
    return metric.higherIsBetter ? t : 1 - t;
  };

  const hovered = hover ? pairings.get(hover) : null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="label-caps">Pairing Matrix · Copy × Creative</h2>
        <div className="flex border border-ink-800/12 rounded-lg overflow-hidden bg-cream-100">
          {MATRIX_METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetricKey(m.key)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                metricKey === m.key ? "bg-ink-900 text-cream-200" : "text-ink-800 hover:bg-cream-300"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-cream-100 border border-ink-800/12 rounded-lg p-4 overflow-x-auto">
        <table className="border-separate" style={{ borderSpacing: 3 }}>
          <thead>
            <tr>
              <th className="label-caps text-left pr-3 pb-1">Copy ↓</th>
              {usedCreative.map((cr) => (
                <th key={cr.id} className="pb-1 px-1 text-center" title={cr.name}>
                  <span className="code-chip" style={{
                    backgroundColor: cr.type === "video" ? "#4A78D822" : "#C4922A22",
                    color: cr.type === "video" ? "#3757A8" : "#8A6414",
                  }}>
                    {cr.code}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usedCopy.map((c) => (
              <tr key={c.id}>
                <td className="pr-3 whitespace-nowrap" title={c.name}>
                  <span className="code-chip" style={{ backgroundColor: "#8E33B31c", color: "#71288F" }}>
                    {c.code}
                  </span>
                  <span className="text-[11px] text-taupe-600 ml-1.5">{c.name}</span>
                </td>
                {usedCreative.map((cr) => {
                  const pk = pairKey(cr.id, c.id);
                  const p = pairings.get(pk);
                  const v = p ? metric.value(p.totals) : null;
                  if (!p || v === null || !Number.isFinite(v)) {
                    return (
                      <td key={cr.id} className="text-center">
                        <div className="w-[74px] h-9 rounded flex items-center justify-center text-[11px] text-taupe-400 border border-dashed border-ink-800/10">
                          ·
                        </div>
                      </td>
                    );
                  }
                  const t = scaleT(v);
                  return (
                    <td key={cr.id} className="text-center">
                      <div
                        className="w-[74px] h-9 rounded flex items-center justify-center font-num text-[11.5px] font-medium cursor-default"
                        style={{
                          background: rampColor(t),
                          color: t > 0.55 ? "#FAF6EE" : "#2A2520",
                          outline: hover === pk ? "2px solid #1E1A17" : "none",
                        }}
                        onMouseEnter={() => setHover(pk)}
                        onMouseLeave={() => setHover(null)}
                      >
                        {formatMetric(v, metric.fmt)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-[11px] text-taupe-600">
            <span>{metric.higherIsBetter ? "Low" : "High"} {metric.label}</span>
            <div className="flex h-2.5 rounded overflow-hidden">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} className="w-4" style={{ background: rampColor(i / 7) }} />
              ))}
            </div>
            <span>{metric.higherIsBetter ? "High" : "Low"} {metric.label} · darker is always better</span>
          </div>
          <div className="text-[11px] text-taupe-500 font-num min-h-4">
            {hovered
              ? `${hovered.adIds.length} ad${hovered.adIds.length > 1 ? "s" : ""} · ` +
                `${formatMetric(hovered.totals.spend, "money")} spend · ` +
                `${formatMetric(derived.totalSalesCount(hovered.totals), "int")} sales · ` +
                `${formatMetric(derived.fullRoas(hovered.totals), "ratio")} full ROAS`
              : "Hover a cell for detail · dashed cells never ran"}
          </div>
        </div>
      </div>
    </section>
  );
}
