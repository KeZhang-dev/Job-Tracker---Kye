// CSV backup (export) and restore (import with validation + duplicate detection).
// Stage history and events are embedded as JSON columns so one file is a full backup.

import Papa from "papaparse";
import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  EVENT_TYPES,
  FALLBACK_CATEGORY,
  SOURCES,
  SOURCE_LABELS,
  STAGES,
  STAGE_LABELS,
  WORK_MODES,
  WORK_MODE_LABELS,
  type EmploymentType,
  type Source,
  type Stage,
  type WorkMode,
} from "./constants";
import { isValidDateOnly, normalizeDateInput, todayDateOnly } from "./dates";
import { isUuid, newId } from "./ids";
import type { Application, ApplicationEvent, Category, StageChange } from "./types";
import { LIMITS } from "./validation";

const COLUMNS = [
  ["id", "ID"],
  ["companyName", "Company Name"],
  ["jobTitle", "Job Title"],
  ["category", "Role Category"],
  ["location", "Location"],
  ["workMode", "Work Mode"],
  ["employmentType", "Employment Type"],
  ["source", "Application Source"],
  ["stage", "Current Stage"],
  ["applicationDate", "Application Date"],
  ["closingDate", "Closing Date"],
  ["followUpDate", "Next Follow-up Date"],
  ["updatedAt", "Last Updated"],
  ["createdAt", "Created At"],
  ["notes", "Personal Notes"],
  ["jobDescription", "Job Description"],
  ["history", "Stage History (JSON)"],
  ["events", "Events (JSON)"],
] as const;

type ColumnKey = (typeof COLUMNS)[number][0];

/** Extra header spellings accepted on import (normalised: lowercase letters/digits only). */
const HEADER_ALIASES: Record<string, ColumnKey> = {
  company: "companyName",
  title: "jobTitle",
  position: "jobTitle",
  role: "jobTitle",
  category: "category",
  rolecategory: "category",
  source: "source",
  stage: "stage",
  status: "stage",
  dateapplied: "applicationDate",
  applied: "applicationDate",
  deadline: "closingDate",
  closingdatedeadline: "closingDate",
  followup: "followUpDate",
  followupdate: "followUpDate",
  notes: "notes",
  jd: "jobDescription",
  description: "jobDescription",
  stagehistory: "history",
  stagehistoryjson: "history",
  eventsjson: "events",
};

const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

const HEADER_LOOKUP: Record<string, ColumnKey> = {
  ...HEADER_ALIASES,
  ...Object.fromEntries(COLUMNS.flatMap(([key, label]) => [[normalizeHeader(label), key], [normalizeHeader(key), key]])),
};

// Spreadsheet apps execute cells starting with these characters as formulas.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const escapeCell = (value: string) => (FORMULA_PREFIX.test(value) ? `'${value}` : value);
const unescapeCell = (value: string) => (value.startsWith("'") && FORMULA_PREFIX.test(value.slice(1)) ? value.slice(1) : value);

// ---- Export ----------------------------------------------------------------

export function buildExportCsv(
  apps: Application[],
  categories: Category[],
  history: StageChange[],
  events: ApplicationEvent[],
): string {
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const rows = apps.map((app) => {
    const appHistory = history
      .filter((h) => h.applicationId === app.id)
      .map(({ fromStage, toStage, changedAt, note }) => ({ fromStage, toStage, changedAt, note }));
    const appEvents = events
      .filter((e) => e.applicationId === app.id)
      .map(({ type, date, title, notes }) => ({ type, date, title, notes }));
    const values: Record<ColumnKey, string> = {
      id: app.id,
      companyName: app.companyName,
      jobTitle: app.jobTitle,
      category: categoryNames.get(app.categoryId) ?? FALLBACK_CATEGORY,
      location: app.location,
      workMode: WORK_MODE_LABELS[app.workMode],
      employmentType: EMPLOYMENT_TYPE_LABELS[app.employmentType],
      source: SOURCE_LABELS[app.source],
      stage: STAGE_LABELS[app.stage],
      applicationDate: app.applicationDate ?? "",
      closingDate: app.closingDate ?? "",
      followUpDate: app.followUpDate ?? "",
      updatedAt: app.updatedAt,
      createdAt: app.createdAt,
      notes: app.notes,
      jobDescription: app.jobDescription,
      history: JSON.stringify(appHistory),
      events: JSON.stringify(appEvents),
    };
    return COLUMNS.map(([key]) => escapeCell(values[key]));
  });
  return Papa.unparse({ fields: COLUMNS.map(([, label]) => label), data: rows }, { quotes: true });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Import ----------------------------------------------------------------

export type ImportStatus = "new" | "duplicate" | "invalid";

export interface ImportRow {
  rowNumber: number;
  status: ImportStatus;
  errors: string[];
  warnings: string[];
  companyName: string;
  jobTitle: string;
  /** Existing application this row duplicates (same ID, or same company + title + date). */
  duplicateOfId?: string;
  record?: {
    application: Omit<Application, "categoryId">;
    categoryName: string;
    history: StageChange[];
    events: ApplicationEvent[];
  };
}

export interface ImportPreview {
  rows: ImportRow[];
  /** Problems with the file as a whole (bad headers, parse failure). */
  fileErrors: string[];
}

export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

function matchEnum<T extends string>(raw: string, values: readonly T[], labels: Record<T, string>): T | null {
  const target = normalizeHeader(raw);
  if (!target) return null;
  return values.find((v) => normalizeHeader(v) === target || normalizeHeader(labels[v]) === target) ?? null;
}

const duplicateKey = (company: string, title: string, date: string | null) =>
  `${company.trim().toLowerCase()}|${title.trim().toLowerCase()}|${date ?? ""}`;

function parseHistory(raw: string, applicationId: string, warnings: string[]): StageChange[] | null {
  if (!raw.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error();
    const result: StageChange[] = [];
    for (const item of parsed) {
      const { fromStage, toStage, changedAt, note } = item ?? {};
      const validFrom = fromStage === null || STAGES.includes(fromStage);
      if (!validFrom || !STAGES.includes(toStage) || typeof changedAt !== "string" || Number.isNaN(Date.parse(changedAt))) {
        throw new Error();
      }
      result.push({ id: newId(), applicationId, fromStage, toStage, changedAt, note: typeof note === "string" ? note : "" });
    }
    return result;
  } catch {
    warnings.push("Stage history could not be read and was replaced with a single entry.");
    return null;
  }
}

function parseEvents(raw: string, applicationId: string, warnings: string[]): ApplicationEvent[] {
  if (!raw.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error();
    return parsed.map((item) => {
      const { type, date, title, notes } = item ?? {};
      if (!EVENT_TYPES.includes(type) || !isValidDateOnly(date)) throw new Error();
      return {
        id: newId(),
        applicationId,
        type,
        date,
        title: typeof title === "string" ? title : "",
        notes: typeof notes === "string" ? notes : "",
      };
    });
  } catch {
    warnings.push("Interview/assessment events could not be read and were skipped.");
    return [];
  }
}

/** Reads a CSV file in the browser and previews it. The server re-validates the text on import. */
export async function readImportFile(file: File, existing: Application[]): Promise<{ text: string; preview: ImportPreview }> {
  if (file.size > MAX_IMPORT_BYTES) {
    return { text: "", preview: { rows: [], fileErrors: ["This file is larger than 20 MB. Split it into smaller files and try again."] } };
  }
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { text: "", preview: { rows: [], fileErrors: ["The file could not be read."] } };
  }
  return { text, preview: previewImport(text, existing) };
}

export function previewImport(text: string, existing: Application[]): ImportPreview {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => HEADER_LOOKUP[normalizeHeader(h)] ?? `__unknown:${h}`,
  });

  const fileErrors: string[] = [];
  const fields = parsed.meta.fields ?? [];
  if (!fields.includes("companyName") || !fields.includes("jobTitle")) {
    fileErrors.push('The file needs at least "Company Name" and "Job Title" columns. Export a CSV from this app to see the expected format.');
    return { rows: [], fileErrors };
  }
  const structural = parsed.errors.filter((e) => e.row === undefined);
  if (structural.length > 0) fileErrors.push(...structural.map((e) => e.message));

  const existingById = new Map(existing.map((a) => [a.id, a]));
  const existingByKey = new Map(existing.map((a) => [duplicateKey(a.companyName, a.jobTitle, a.applicationDate), a]));
  const seenInFile = new Map<string, number>();
  const rowErrors = new Map<number, string[]>();
  for (const e of parsed.errors) if (e.row !== undefined) rowErrors.set(e.row, [...(rowErrors.get(e.row) ?? []), e.message]);

  const rows = parsed.data.map((raw, index): ImportRow => {
    const rowNumber = index + 2; // +1 for the header row, +1 for 1-based numbering
    const get = (key: ColumnKey) => unescapeCell((raw[key] ?? "").trim());
    const errors: string[] = [...(rowErrors.get(index) ?? [])];
    const warnings: string[] = [];

    const companyName = get("companyName");
    const jobTitle = get("jobTitle");
    if (!companyName) errors.push("Company name is missing.");
    if (!jobTitle) errors.push("Job title is missing.");
    if (companyName.length > LIMITS.companyName) errors.push("Company name is too long.");
    if (jobTitle.length > LIMITS.jobTitle) errors.push("Job title is too long.");

    const enumField = <T extends string>(key: ColumnKey, values: readonly T[], labels: Record<T, string>, fallback: T, name: string): T => {
      const value = get(key);
      if (!value) return fallback;
      const match = matchEnum(value, values, labels);
      if (!match) warnings.push(`Unknown ${name} "${value}", using "${labels[fallback]}".`);
      return match ?? fallback;
    };
    const stage: Stage = enumField("stage", STAGES, STAGE_LABELS, "applied", "stage");
    const workMode: WorkMode = enumField("workMode", WORK_MODES, WORK_MODE_LABELS, "not_specified", "work mode");
    const employmentType: EmploymentType = enumField("employmentType", EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_LABELS, "full_time", "employment type");
    const source: Source = enumField("source", SOURCES, SOURCE_LABELS, "other", "source");

    const dateField = (key: ColumnKey, name: string) => {
      const value = get(key);
      if (!value) return null;
      const normalized = normalizeDateInput(value);
      if (!normalized) warnings.push(`${name} "${value}" isn't a recognised date and was left empty.`);
      return normalized;
    };
    const applicationDate = dateField("applicationDate", "Application date");
    const closingDate = dateField("closingDate", "Closing date");
    const followUpDate = dateField("followUpDate", "Follow-up date");
    if (!applicationDate) warnings.push("No application date — this record only appears under All Time.");

    // Duplicate detection: same ID, or same company + title + application date.
    const rawId = get("id");
    const key = duplicateKey(companyName, jobTitle, applicationDate);
    const duplicate = (rawId && existingById.get(rawId)) || existingByKey.get(key);
    const earlierRow = seenInFile.get(rawId || key);
    if (earlierRow) errors.push(`Same application as row ${earlierRow} in this file.`);
    else seenInFile.set(rawId || key, rowNumber);

    if (errors.length > 0) return { rowNumber, status: "invalid", errors, warnings, companyName, jobTitle };

    // Keep a valid UUID from a previous export so re-imports stay idempotent.
    const id = duplicate ? duplicate.id : isUuid(rawId) && !existingById.has(rawId) ? rawId : newId();
    const timestamp = new Date().toISOString();
    const validTimestamp = (v: string) => (v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : timestamp);

    const history =
      parseHistory(get("history"), id, warnings) ?? [
        {
          id: newId(),
          applicationId: id,
          fromStage: null,
          toStage: stage,
          changedAt: new Date(`${applicationDate ?? todayDateOnly()}T12:00:00`).toISOString(),
          note: "Imported from CSV",
        },
      ];

    return {
      rowNumber,
      status: duplicate ? "duplicate" : "new",
      errors,
      warnings,
      companyName,
      jobTitle,
      duplicateOfId: duplicate?.id,
      record: {
        categoryName: get("category") || FALLBACK_CATEGORY,
        history,
        events: parseEvents(get("events"), id, warnings),
        application: {
          id,
          companyName,
          jobTitle,
          location: get("location").slice(0, LIMITS.location),
          workMode,
          employmentType,
          jobDescription: get("jobDescription"),
          applicationDate,
          closingDate,
          source,
          stage,
          followUpDate,
          notes: get("notes"),
          isSample: false,
          createdAt: duplicate?.createdAt ?? validTimestamp(get("createdAt")),
          updatedAt: validTimestamp(get("updatedAt")),
        },
      },
    };
  });

  if (rows.length === 0 && fileErrors.length === 0) fileErrors.push("The file has no data rows.");
  return { rows, fileErrors };
}

export type DuplicateMode = "skip" | "overwrite";
