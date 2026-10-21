import { format, isValid, parse, parseISO } from "date-fns";
import type { DateOnly } from "./types";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Parses a "YYYY-MM-DD" value as a local date; returns null for anything invalid. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value || !DATE_ONLY.test(value)) return null;
  const d = parse(value, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : null;
}

export function isValidDateOnly(value: string | null | undefined): value is DateOnly {
  return parseDateOnly(value) !== null;
}

export function toDateOnly(date: Date): DateOnly {
  return format(date, "yyyy-MM-dd");
}

export function todayDateOnly(): DateOnly {
  return toDateOnly(new Date());
}

export function formatDate(value: string | null | undefined): string {
  const d = parseDateOnly(value);
  return d ? format(d, "d MMM yyyy") : "—";
}

export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "—";
  const d = parseISO(value);
  return isValid(d) ? format(d, "d MMM yyyy, h:mm a") : "—";
}

/** Value for an <input type="datetime-local"> from an ISO timestamp. */
export function toDateTimeLocal(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, "yyyy-MM-dd'T'HH:mm") : "";
}

/**
 * Normalises loosely formatted dates from CSV files into "YYYY-MM-DD".
 * Accepts ISO dates/timestamps and the day-first formats common in NZ/AU.
 */
export function normalizeDateInput(raw: string): DateOnly | null {
  const value = raw.trim();
  if (!value) return null;
  if (isValidDateOnly(value)) return value;
  const iso = parseISO(value);
  if (isValid(iso) && /^\d{4}-\d{2}-\d{2}T/.test(value)) return toDateOnly(iso);
  for (const pattern of ["d/M/yyyy", "d-M-yyyy", "d.M.yyyy", "d MMM yyyy", "d MMMM yyyy"]) {
    const d = parse(value, pattern, new Date());
    if (isValid(d) && d.getFullYear() > 1900) return toDateOnly(d);
  }
  return null;
}

/** Local calendar date of an ISO timestamp, e.g. "3 Mar 2025". */
export function formatTimestampDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = parseISO(value);
  return isValid(d) ? format(d, "d MMM yyyy") : "—";
}
