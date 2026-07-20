"use client";

import { useEffect, useRef, useState } from "react";
import type { RangeSelection } from "../dashboard-client";
import { PRESETS, fmtRange, iso, parse } from "@/lib/dates";

interface Props {
  selection: RangeSelection;
  onChange: (s: RangeSelection) => void;
  dataStart: string;
  dataEnd: string;
}

export default function DateRangeControl({ selection, onChange, dataStart, dataEnd }: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calendarOpen) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [calendarOpen]);

  return (
    <div className="flex items-center gap-2 flex-wrap" ref={wrapRef}>
      <div className="flex border border-ink-800/12 rounded-lg overflow-hidden bg-cream-100">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              setCalendarOpen(false);
              onChange({ presetKey: p.key, range: p.range(dataEnd, dataStart) });
            }}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              selection.presetKey === p.key
                ? "bg-ink-900 text-cream-200"
                : "text-ink-800 hover:bg-cream-300"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <button
          onClick={() => setCalendarOpen((o) => !o)}
          className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border rounded-lg transition-colors ${
            selection.presetKey === null
              ? "bg-gold-500 text-ink-900 border-gold-500"
              : "bg-cream-100 text-ink-800 border-ink-800/12 hover:bg-cream-300"
          }`}
        >
          {selection.presetKey === null ? fmtRange(selection.range) : "Custom"}
        </button>
        {calendarOpen && (
          <CustomCalendar
            range={selection.range}
            dataStart={dataStart}
            dataEnd={dataEnd}
            onApply={(range) => {
              onChange({ presetKey: null, range });
              setCalendarOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

// --- Two-month custom calendar --------------------------------------------

function CustomCalendar({
  range,
  dataStart,
  dataEnd,
  onApply,
}: {
  range: { from: string; to: string };
  dataStart: string;
  dataEnd: string;
  onApply: (r: { from: string; to: string }) => void;
}) {
  const [anchor, setAnchor] = useState<string | null>(null); // first click
  const [hover, setHover] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => dataEnd.slice(0, 7)); // "YYYY-MM" of right-hand month

  const provisional: { from: string; to: string } | null = anchor
    ? hover
      ? anchor <= hover
        ? { from: anchor, to: hover }
        : { from: hover, to: anchor }
      : { from: anchor, to: anchor }
    : null;
  const shown = provisional ?? range;

  const rightMonth = viewMonth;
  const leftMonth = shiftMonth(viewMonth, -1);

  return (
    <div className="absolute top-full left-0 md:left-auto md:right-0 mt-2 bg-cream-100 border border-ink-800/12 rounded-lg shadow-lg p-4 z-50 w-[min(560px,calc(100vw-2rem))]">
      <div className="flex items-center justify-between mb-3">
        <button
          className="px-2 py-1 text-sm rounded hover:bg-cream-300"
          onClick={() => setViewMonth(shiftMonth(viewMonth, -1))}
        >
          ←
        </button>
        <span className="label-caps">
          {anchor ? "Pick end date" : "Pick start date"}
        </span>
        <button
          className="px-2 py-1 text-sm rounded hover:bg-cream-300"
          onClick={() => setViewMonth(shiftMonth(viewMonth, 1))}
        >
          →
        </button>
      </div>
      <div className="flex gap-6 flex-wrap">
        {[leftMonth, rightMonth].map((m) => (
          <MonthGrid
            key={m}
            month={m}
            shown={shown}
            dataStart={dataStart}
            dataEnd={dataEnd}
            onPick={(d) => {
              if (!anchor) {
                setAnchor(d);
              } else {
                const from = anchor <= d ? anchor : d;
                const to = anchor <= d ? d : anchor;
                setAnchor(null);
                onApply({ from, to });
              }
            }}
            onHover={setHover}
          />
        ))}
      </div>
    </div>
  );
}

function shiftMonth(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

function MonthGrid({
  month,
  shown,
  dataStart,
  dataEnd,
  onPick,
  onHover,
}: {
  month: string; // "YYYY-MM"
  shown: { from: string; to: string };
  dataStart: string;
  dataEnd: string;
  onPick: (d: string) => void;
  onHover: (d: string | null) => void;
}) {
  const first = month + "-01";
  const firstDate = parse(first);
  const monthName = firstDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const startDow = (firstDate.getUTCDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(
    Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth() + 1, 0)
  ).getUTCDate();

  const cells: (string | null)[] = [
    ...Array<null>(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      iso(new Date(firstDate.getTime() + i * 86400000))
    ),
  ];

  return (
    <div className="flex-1 min-w-[220px]">
      <div className="text-sm font-semibold text-ink-900 mb-2 text-center">{monthName}</div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="label-caps !text-[10px] py-1">{d}</span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`x${i}`} />;
          const disabled = d < dataStart || d > dataEnd;
          const inShown = d >= shown.from && d <= shown.to;
          const isEdge = d === shown.from || d === shown.to;
          return (
            <button
              key={d}
              disabled={disabled}
              onClick={() => onPick(d)}
              onMouseEnter={() => onHover(d)}
              onMouseLeave={() => onHover(null)}
              className={`text-xs py-1.5 rounded font-num transition-colors ${
                disabled
                  ? "text-taupe-400 cursor-not-allowed"
                  : isEdge
                    ? "bg-ink-900 text-cream-200"
                    : inShown
                      ? "bg-cream-300 text-ink-800"
                      : "text-ink-800 hover:bg-cream-300"
              }`}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
