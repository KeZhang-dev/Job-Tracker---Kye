// Pure, reusable metric selectors. Every dashboard figure is derived here from
// the stored records, so the UI never re-implements counting logic.

import {
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import {
  INTERVIEW_EVENT_TYPES,
  SOURCES,
  SOURCE_LABELS,
  isInterviewStage,
  isTerminalStage,
  type Source,
  type Stage,
} from "./constants";
import { parseDateOnly } from "./dates";
import type { Application, ApplicationEvent, Category, StageChange } from "./types";

// ---- Date filtering --------------------------------------------------------

export type DatePreset = "all" | "30d" | "90d" | "180d";
export interface DateFilter {
  preset: DatePreset;
}

export interface ResolvedRange {
  from: Date | null;
  to: Date | null;
}

export function resolveRange(filter: DateFilter, today = new Date()): ResolvedRange {
  switch (filter.preset) {
    case "all":
      return { from: null, to: null };
    case "30d":
      return { from: startOfDay(subDays(today, 29)), to: endOfDay(today) };
    case "90d":
      return { from: startOfDay(subDays(today, 89)), to: endOfDay(today) };
    case "180d":
      return { from: startOfDay(subDays(today, 179)), to: endOfDay(today) };
  }
}

/**
 * Applications whose application date falls in the range. With no bounds
 * (All Time) every record is included, even ones without a valid date.
 */
export function filterByDateRange(apps: Application[], range: ResolvedRange): Application[] {
  if (!range.from && !range.to) return apps;
  return apps.filter((app) => {
    const date = parseDateOnly(app.applicationDate);
    if (!date) return false;
    if (range.from && date < range.from) return false;
    if (range.to && date > range.to) return false;
    return true;
  });
}

// ---- Stage reach -----------------------------------------------------------

/** Every stage each application has ever been in (history plus current stage). */
export function stagesReached(apps: Application[], history: StageChange[]): Map<string, Set<Stage>> {
  const reached = new Map<string, Set<Stage>>();
  for (const app of apps) reached.set(app.id, new Set([app.stage]));
  for (const change of history) {
    const set = reached.get(change.applicationId);
    if (!set) continue;
    set.add(change.toStage);
    if (change.fromStage) set.add(change.fromStage);
  }
  return reached;
}

function groupEvents(events: ApplicationEvent[]): Map<string, ApplicationEvent[]> {
  const map = new Map<string, ApplicationEvent[]>();
  for (const e of events) {
    const list = map.get(e.applicationId);
    if (list) list.push(e);
    else map.set(e.applicationId, [e]);
  }
  return map;
}

// ---- Summary ---------------------------------------------------------------

export interface Summary {
  /** All application records in the period. */
  total: number;
  /** Not in a terminal outcome (Offer counts as active until resolved). */
  active: number;
  /** Unique applications that ever reached an interview stage or have a logged interview. */
  interviewed: number;
  /** Applications whose current stage is an interview stage. */
  currentlyInterviewing: number;
  /** Logged interview events (rounds) — can exceed `interviewed`. */
  interviewRounds: number;
  /** Unique applications that ever reached the Offer stage. */
  offers: number;
  /** Applications whose current outcome is Rejected. */
  rejections: number;
}

export function computeSummary(apps: Application[], history: StageChange[], events: ApplicationEvent[]): Summary {
  const reached = stagesReached(apps, history);
  const eventsByApp = groupEvents(events);
  const summary: Summary = {
    total: apps.length,
    active: 0,
    interviewed: 0,
    currentlyInterviewing: 0,
    interviewRounds: 0,
    offers: 0,
    rejections: 0,
  };

  for (const app of apps) {
    const stages = reached.get(app.id) ?? new Set<Stage>();
    const appEvents = eventsByApp.get(app.id) ?? [];
    const interviewEvents = appEvents.filter((e) => INTERVIEW_EVENT_TYPES.includes(e.type)).length;

    const wasInterviewed = interviewEvents > 0 || [...stages].some(isInterviewStage);
    const gotOffer = stages.has("offer");

    if (!isTerminalStage(app.stage)) summary.active++;
    if (isInterviewStage(app.stage)) summary.currentlyInterviewing++;
    if (app.stage === "rejected") summary.rejections++;
    if (wasInterviewed) summary.interviewed++;
    if (gotOffer) summary.offers++;
    summary.interviewRounds += interviewEvents;
  }
  return summary;
}

// ---- Distributions ---------------------------------------------------------

export interface DistributionRow {
  key: string;
  label: string;
  count: number;
  /** 0–1 share of the total. */
  share: number;
}

function toRows(counts: Map<string, { label: string; count: number }>, total: number): DistributionRow[] {
  return [...counts.entries()]
    .map(([key, { label, count }]) => ({ key, label, count, share: total > 0 ? count / total : 0 }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function roleDistribution(apps: Application[], categories: Category[]): DistributionRow[] {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const counts = new Map<string, { label: string; count: number }>();
  for (const app of apps) {
    const entry = counts.get(app.categoryId) ?? { label: names.get(app.categoryId) ?? "Uncategorised", count: 0 };
    entry.count++;
    counts.set(app.categoryId, entry);
  }
  return toRows(counts, apps.length);
}

export function sourceDistribution(apps: Application[]): DistributionRow[] {
  const counts = new Map<string, { label: string; count: number }>(
    SOURCES.map((s) => [s, { label: SOURCE_LABELS[s], count: 0 }]),
  );
  for (const app of apps) {
    const key: Source = counts.has(app.source) ? app.source : "other";
    counts.get(key)!.count++;
  }
  return toRows(counts, apps.length);
}

// ---- Trends ----------------------------------------------------------------

export type TrendGranularity = "week" | "month";
export interface TrendPoint {
  key: string;
  label: string;
  /** Full label for tooltips, e.g. "Week of 3 Mar 2025". */
  fullLabel: string;
  count: number;
}

export function applicationTrend(
  apps: Application[],
  granularity: TrendGranularity,
  range: ResolvedRange,
): { points: TrendPoint[]; undated: number } {
  const dates: Date[] = [];
  let undated = 0;
  for (const app of apps) {
    const d = parseDateOnly(app.applicationDate);
    if (d) dates.push(d);
    else undated++;
  }
  if (dates.length === 0) return { points: [], undated };

  const times = dates.map((d) => d.getTime());
  const start = range.from ?? new Date(Math.min(...times));
  const end = range.to ?? new Date(Math.max(...times));

  const bucketStart = (d: Date) =>
    granularity === "week" ? startOfWeek(d, { weekStartsOn: 1 }) : startOfMonth(d);
  const buckets =
    granularity === "week"
      ? eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
      : eachMonthOfInterval({ start, end });

  const counts = new Map<number, number>();
  for (const d of dates) {
    const key = bucketStart(d).getTime();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const points = buckets.map((b) => ({
    key: b.toISOString(),
    label: granularity === "week" ? format(b, "d MMM") : format(b, "MMM yy"),
    fullLabel: granularity === "week" ? `Week of ${format(b, "d MMM yyyy")}` : format(b, "MMMM yyyy"),
    count: counts.get(b.getTime()) ?? 0,
  }));
  return { points, undated };
}

export function formatPercent(value: number | null, digits = 0): string {
  return value === null ? "—" : `${(value * 100).toFixed(digits)}%`;
}
