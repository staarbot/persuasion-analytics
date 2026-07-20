// Date-range logic. All ranges are inclusive ISO dates, computed relative to
// a reference "today" (the dataset's last complete day, or real today live).
// Weeks are Monday–Sunday.

import type { DateRange } from "@/lib/providers/types";

export const DAY = 86400000;

export function parse(d: string): Date {
  return new Date(d + "T00:00:00Z");
}
export function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function addDays(d: string, n: number): string {
  return iso(new Date(parse(d).getTime() + n * DAY));
}

/** Monday of the week containing d */
export function weekStart(d: string): string {
  const dt = parse(d);
  const dow = (dt.getUTCDay() + 6) % 7; // Mon=0
  return addDays(d, -dow);
}
export function monthStart(d: string): string {
  return d.slice(0, 8) + "01";
}
export function monthEnd(d: string): string {
  const dt = parse(monthStart(d));
  const next = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 1));
  return iso(new Date(next.getTime() - DAY));
}
export function quarterStart(d: string): string {
  const dt = parse(d);
  const qMonth = Math.floor(dt.getUTCMonth() / 3) * 3;
  return iso(new Date(Date.UTC(dt.getUTCFullYear(), qMonth, 1)));
}

/** The most recent COMPLETE Mon–Sun week strictly before today */
export function lastFullWeek(today: string): DateRange {
  const thisWeekStart = weekStart(today);
  return { from: addDays(thisWeekStart, -7), to: addDays(thisWeekStart, -1) };
}
export function previousFullWeek(today: string): DateRange {
  const lw = lastFullWeek(today);
  return { from: addDays(lw.from, -7), to: addDays(lw.from, -1) };
}
export function lastFullMonth(today: string): DateRange {
  const thisMonthStart = monthStart(today);
  const prevEnd = addDays(thisMonthStart, -1);
  return { from: monthStart(prevEnd), to: prevEnd };
}
export function previousFullMonth(today: string): DateRange {
  const lm = lastFullMonth(today);
  const prevEnd = addDays(lm.from, -1);
  return { from: monthStart(prevEnd), to: prevEnd };
}
export function lastFullQuarter(today: string): DateRange {
  const thisQStart = quarterStart(today);
  const prevEnd = addDays(thisQStart, -1);
  return { from: quarterStart(prevEnd), to: prevEnd };
}
export function previousFullQuarter(today: string): DateRange {
  const lq = lastFullQuarter(today);
  const prevEnd = addDays(lq.from, -1);
  return { from: quarterStart(prevEnd), to: prevEnd };
}

/** This week/month so far (partial periods, for the sales tiles) */
export function thisWeekToDate(today: string): DateRange {
  return { from: weekStart(today), to: today };
}
export function thisMonthToDate(today: string): DateRange {
  return { from: monthStart(today), to: today };
}

export interface Preset {
  key: string;
  label: string;
  range: (today: string, dataStart: string) => DateRange;
}

export const PRESETS: Preset[] = [
  { key: "7d", label: "Last 7 days", range: (t) => ({ from: addDays(t, -6), to: t }) },
  { key: "14d", label: "Last 14 days", range: (t) => ({ from: addDays(t, -13), to: t }) },
  { key: "28d", label: "Last 28 days", range: (t) => ({ from: addDays(t, -27), to: t }) },
  { key: "thisMonth", label: "This month", range: (t) => thisMonthToDate(t) },
  { key: "lastMonth", label: "Last month", range: (t) => lastFullMonth(t) },
  { key: "90d", label: "Last 90 days", range: (t) => ({ from: addDays(t, -89), to: t }) },
  { key: "lifetime", label: "Lifetime", range: (t, ds) => ({ from: ds, to: t }) },
];

export function fmtRange(r: DateRange): string {
  const f = (d: string) =>
    parse(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `${f(r.from)} – ${f(r.to)}`;
}
