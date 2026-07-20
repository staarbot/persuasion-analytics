"use client";

// Hand-rolled SVG bar chart (no chart deps). Follows the dataviz mark specs:
// thin bars, rounded data-ends anchored to the baseline, 2px surface gaps
// between stacked segments, recessive grid, hover tooltip, selective labels.

import { useState } from "react";
import { formatMetric, type MetricFormat } from "@/lib/metrics";

export interface ChartSeries {
  name: string;
  color: string;
  values: (number | null)[];
}

interface Props {
  labels: string[];
  series: ChartSeries[]; // 1 series = plain bars; 2 = stacked
  format: MetricFormat;
  height?: number;
  /** Dashed reference line (e.g. 1.0 for ROAS break-even) */
  refLine?: number;
  /** Mark partial buckets (first/last) with reduced opacity */
  partialFlags?: boolean[];
}

const W = 600;
const PAD_L = 44;
const PAD_R = 8;
const PAD_T = 14;
const PAD_B = 20;

/** Rect with only the data-end corners rounded, anchored to the baseline */
function barPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

function niceTicks(max: number): number[] {
  if (max <= 0) return [0];
  const raw = max / 3;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const ticks: number[] = [];
  for (let v = 0; v <= max * 1.001; v += step) ticks.push(v);
  return ticks;
}

function shortNum(v: number, format: MetricFormat): string {
  if (format === "pct") return (v * 100).toFixed(v * 100 >= 10 ? 0 : 1) + "%";
  if (format === "ratio") return v.toFixed(1) + "x";
  const money = format === "money" || format === "money2";
  const abs = Math.abs(v);
  const fmt = (n: number, suffix: string) =>
    (money ? "$" : "") + (Number.isInteger(n) ? n : n.toFixed(1)) + suffix;
  if (abs >= 1_000_000) return fmt(v / 1_000_000, "M");
  if (abs >= 1_000) return fmt(v / 1_000, "k");
  return fmt(v, "");
}

export default function BarChart({
  labels,
  series,
  format,
  height = 190,
  refLine,
  partialFlags,
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const H = height;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const n = labels.length;

  const stackTotal = (i: number) =>
    series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0);
  const maxVal = Math.max(
    refLine ?? 0,
    ...Array.from({ length: n }, (_, i) => stackTotal(i))
  );
  const ticks = niceTicks(maxVal);
  const scaleMax = Math.max(ticks[ticks.length - 1] ?? 1, maxVal) || 1;
  const yOf = (v: number) => PAD_T + plotH * (1 - v / scaleMax);

  const slot = plotW / Math.max(n, 1);
  const barW = Math.max(2, Math.min(28, slot - 2));
  const xOf = (i: number) => PAD_L + slot * i + (slot - barW) / 2;
  const rounding = barW >= 8 ? 4 : 1.5;

  // Show at most ~8 x labels, always including first and last
  const labelEvery = Math.max(1, Math.ceil(n / 8));

  // Selective direct label: the max bar only (tooltips cover the rest)
  const maxIdx =
    n > 0
      ? Array.from({ length: n }, (_, i) => i).reduce((a, b) =>
          stackTotal(a) >= stackTotal(b) ? a : b
        )
      : null;

  const GAP = 2; // surface gap between stacked segments

  return (
    <div className="relative">
      {series.length > 1 && (
        <div className="flex gap-4 mb-1">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5 text-[11px] text-taupe-600">
              <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {/* Recessive grid + tick labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_L} x2={W - PAD_R} y1={yOf(t)} y2={yOf(t)}
              stroke="#2A2520" strokeOpacity={t === 0 ? 0.25 : 0.08} strokeWidth={1}
            />
            <text
              x={PAD_L - 6} y={yOf(t) + 3} textAnchor="end"
              fontSize={9.5} fill="#8A7A63" fontFamily="var(--font-mono)"
            >
              {shortNum(t, format)}
            </text>
          </g>
        ))}
        {refLine !== undefined && refLine <= scaleMax && (
          <line
            x1={PAD_L} x2={W - PAD_R} y1={yOf(refLine)} y2={yOf(refLine)}
            stroke="#6B5E4D" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.6}
          />
        )}
        {/* Bars */}
        {labels.map((_, i) => {
          const dim = partialFlags?.[i] ? 0.45 : 1;
          let yCursor = yOf(0);
          return (
            <g key={i} opacity={hover === null || hover === i ? dim : dim * 0.45}>
              {series.map((s, si) => {
                const v = s.values[i];
                if (v === null || v <= 0) return null;
                const top = yOf(series.slice(0, si + 1).reduce((sum, ss) => sum + (ss.values[i] ?? 0), 0));
                const segH = Math.max(1, yCursor - top - (si > 0 ? GAP : 0));
                const segY = yCursor - segH - (si > 0 ? GAP : 0);
                yCursor = segY;
                return (
                  <path
                    key={s.name}
                    d={barPath(xOf(i), segY, barW, segH, si === series.length - 1 ? rounding : 1)}
                    fill={s.color}
                  />
                );
              })}
            </g>
          );
        })}
        {/* Direct label on the max bar */}
        {maxIdx !== null && stackTotal(maxIdx) > 0 && (
          <text
            x={xOf(maxIdx) + barW / 2} y={yOf(stackTotal(maxIdx)) - 4}
            textAnchor="middle" fontSize={9.5} fontWeight={600}
            fill="#2A2520" fontFamily="var(--font-mono)"
          >
            {shortNum(stackTotal(maxIdx), format)}
          </text>
        )}
        {/* X labels */}
        {labels.map((l, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text
              key={i}
              x={xOf(i) + barW / 2} y={H - 6} textAnchor="middle"
              fontSize={9} fill="#8A7A63" fontFamily="var(--font-body)"
            >
              {l}
            </text>
          ) : null
        )}
        {/* Hover hit targets: full column height */}
        {labels.map((_, i) => (
          <rect
            key={i}
            x={PAD_L + slot * i} y={PAD_T} width={slot} height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {/* Tooltip */}
      {hover !== null && (
        <div
          className="absolute z-10 bg-ink-900 text-cream-100 rounded px-2.5 py-1.5 text-[11px] pointer-events-none shadow-lg"
          style={{
            left: `${((PAD_L + slot * hover + slot / 2) / W) * 100}%`,
            top: 0,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-semibold mb-0.5 whitespace-nowrap">
            {labels[hover]}
            {partialFlags?.[hover] ? " · partial" : ""}
          </div>
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5 whitespace-nowrap font-num">
              {series.length > 1 && (
                <span className="w-2 h-2 rounded-[2px]" style={{ background: s.color }} />
              )}
              {series.length > 1 ? `${s.name}: ` : ""}
              {formatMetric(s.values[hover], format)}
            </div>
          ))}
          {series.length > 1 && (
            <div className="whitespace-nowrap font-num border-t border-cream-100/20 mt-0.5 pt-0.5">
              Total: {formatMetric(stackTotal(hover), format)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
