// Search / filter / sort for the Applications table, kept pure so it can be
// tested and reused independently of the UI.

import {
  EMPLOYMENT_TYPES,
  SOURCES,
  STAGES,
  WORK_MODES,
  isTerminalStage,
  type EmploymentType,
  type Source,
  type Stage,
  type WorkMode,
} from "./constants";
import type { Application, Category } from "./types";

export const SORT_FIELDS = ["applicationDate", "closingDate", "companyName", "jobTitle", "updatedAt"] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortDirection = "asc" | "desc";

export type StageFilter = Stage | "active" | "terminal";

export interface ApplicationQuery {
  search: string;
  categoryId: string | null;
  stage: StageFilter | null;
  location: string | null;
  workMode: WorkMode | null;
  employmentType: EmploymentType | null;
  source: Source | null;
  sort: SortField;
  direction: SortDirection;
}

export const DEFAULT_QUERY: ApplicationQuery = {
  search: "",
  categoryId: null,
  stage: null,
  location: null,
  workMode: null,
  employmentType: null,
  source: null,
  sort: "applicationDate",
  direction: "desc",
};

const oneOf = <T extends string>(values: readonly T[], v: string | null): T | null =>
  v && (values as readonly string[]).includes(v) ? (v as T) : null;

export function queryFromParams(params: URLSearchParams): ApplicationQuery {
  const stage = params.get("stage");
  return {
    search: params.get("q") ?? "",
    categoryId: params.get("category"),
    stage: stage === "active" || stage === "terminal" ? stage : oneOf(STAGES, stage),
    location: params.get("location"),
    workMode: oneOf(WORK_MODES, params.get("mode")),
    employmentType: oneOf(EMPLOYMENT_TYPES, params.get("type")),
    source: oneOf(SOURCES, params.get("source")),
    sort: oneOf(SORT_FIELDS, params.get("sort")) ?? DEFAULT_QUERY.sort,
    direction: params.get("dir") === "asc" ? "asc" : params.get("dir") === "desc" ? "desc" : DEFAULT_QUERY.direction,
  };
}

export function paramsFromQuery(q: ApplicationQuery): URLSearchParams {
  const params = new URLSearchParams();
  const entries: [string, string | null][] = [
    ["q", q.search || null],
    ["category", q.categoryId],
    ["stage", q.stage],
    ["location", q.location],
    ["mode", q.workMode],
    ["type", q.employmentType],
    ["source", q.source],
    ["sort", q.sort !== DEFAULT_QUERY.sort ? q.sort : null],
    ["dir", q.direction !== DEFAULT_QUERY.direction ? q.direction : null],
  ];
  for (const [key, value] of entries) if (value) params.set(key, value);
  return params;
}

export function activeFilterCount(q: ApplicationQuery): number {
  return [q.categoryId, q.stage, q.location, q.workMode, q.employmentType, q.source].filter(Boolean).length;
}

/** Distinct locations (case-insensitive), for the location filter. */
export function distinctLocations(apps: Application[]): string[] {
  const seen = new Map<string, string>();
  for (const a of apps) {
    const loc = a.location.trim();
    if (loc && !seen.has(loc.toLowerCase())) seen.set(loc.toLowerCase(), loc);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

function compare(a: Application, b: Application, field: SortField): number {
  if (field === "companyName" || field === "jobTitle") {
    return a[field].localeCompare(b[field], undefined, { sensitivity: "base" });
  }
  return (a[field] ?? "").localeCompare(b[field] ?? "");
}

export function applyQuery(apps: Application[], q: ApplicationQuery, categories: Category[]): Application[] {
  const term = q.search.trim().toLowerCase();
  const knownCategory = !q.categoryId || categories.some((c) => c.id === q.categoryId);

  const filtered = apps.filter((a) => {
    if (term && !a.companyName.toLowerCase().includes(term) && !a.jobTitle.toLowerCase().includes(term)) return false;
    if (q.categoryId && knownCategory && a.categoryId !== q.categoryId) return false;
    if (q.stage === "active" && isTerminalStage(a.stage)) return false;
    if (q.stage === "terminal" && !isTerminalStage(a.stage)) return false;
    if (q.stage && q.stage !== "active" && q.stage !== "terminal" && a.stage !== q.stage) return false;
    if (q.location && a.location.trim().toLowerCase() !== q.location.toLowerCase()) return false;
    if (q.workMode && a.workMode !== q.workMode) return false;
    if (q.employmentType && a.employmentType !== q.employmentType) return false;
    if (q.source && a.source !== q.source) return false;
    return true;
  });

  const sign = q.direction === "asc" ? 1 : -1;
  return filtered.sort((a, b) => {
    // Records missing the sort value always go last, whichever the direction.
    const aMissing = !a[q.sort];
    const bMissing = !b[q.sort];
    if (aMissing !== bMissing) return aMissing ? 1 : -1;
    return sign * compare(a, b, q.sort) || b.updatedAt.localeCompare(a.updatedAt);
  });
}
