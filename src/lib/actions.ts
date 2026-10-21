"use server";

// Server actions: the only way the browser can change data. Every argument is
// treated as untrusted and validated here before reaching the repository.

import { refresh } from "next/cache";
import { describeError } from "@/db/errors";
import type { ActionResult } from "./action-result";
import { EVENT_TYPES, STAGES, type EventType, type Stage } from "./constants";
import type { DuplicateMode } from "./csv";
import { isValidDateOnly } from "./dates";
import { isUuid } from "./ids";
import * as repo from "./repository";
import { loadSampleData } from "./sample-data";
import type { ApplicationInput } from "./types";
import { validateApplication, type ApplicationFormValues, type FormErrors } from "./validation";

async function run<T>(fn: () => Promise<T>, { refreshPage = true } = {}): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    if (refreshPage) refresh(); // re-render the current page with fresh data in the same round trip
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: describeError(err) };
  }
}

const invalid = (error = "Invalid request."): ActionResult<never> => ({ ok: false, error });
const str = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");

const FORM_KEYS = [
  "companyName", "jobTitle", "categoryId", "location", "workMode", "employmentType",
  "jobDescription", "applicationDate", "closingDate", "source", "stage", "followUpDate", "notes",
] as const satisfies readonly (keyof ApplicationFormValues)[];

/** Copies only known string fields; validateApplication then checks each value. */
function sanitizeForm(raw: unknown): ApplicationFormValues {
  const source = (raw ?? {}) as Record<string, unknown>;
  return Object.fromEntries(FORM_KEYS.map((k) => [k, typeof source[k] === "string" ? source[k] : ""])) as unknown as ApplicationFormValues;
}

/** Validates form values against the categories in the database, then runs the write. */
async function withValidForm<T>(values: unknown, write: (input: ApplicationInput) => Promise<T>): Promise<ActionResult<T>> {
  let fieldErrors: FormErrors | undefined;
  const result = await run(async () => {
    const categories = await repo.listCategories();
    const { errors, input } = validateApplication(sanitizeForm(values), new Set(categories.map((c) => c.id)));
    if (!input) {
      fieldErrors = errors;
      throw new repo.UserFacingError("Please fix the highlighted fields.");
    }
    return write(input);
  });
  return result.ok ? result : { ...result, fieldErrors };
}

// ---- Applications ----------------------------------------------------------

export async function createApplicationAction(values: ApplicationFormValues): Promise<ActionResult<string>> {
  return withValidForm(values, (input) => repo.createApplication(input));
}

export async function updateApplicationAction(id: string, values: ApplicationFormValues, stageNote: string): Promise<ActionResult> {
  if (!isUuid(id)) return invalid();
  return withValidForm(values, (input) => repo.updateApplication(id, input, str(stageNote, 2000).trim()));
}

/**
 * `leavingPage`: the caller is about to navigate away (the detail page of the
 * deleted record), so skip re-rendering a page whose record no longer exists.
 */
export async function deleteApplicationAction(id: string, leavingPage = false): Promise<ActionResult> {
  if (!isUuid(id)) return invalid();
  return run(() => repo.deleteApplication(id), { refreshPage: !leavingPage });
}

export async function changeStageAction(id: string, stage: Stage, changedAtIso: string | null, note: string): Promise<ActionResult> {
  if (!isUuid(id) || !STAGES.includes(stage)) return invalid();
  let changedAt: Date | undefined;
  if (changedAtIso) {
    changedAt = new Date(changedAtIso);
    if (Number.isNaN(changedAt.getTime())) return invalid("Enter a valid date and time.");
    if (changedAt.getTime() > Date.now() + 5 * 60_000) return invalid("The change can't be in the future.");
  }
  return run(() => repo.changeStage(id, stage, { changedAt, note: str(note, 2000) }));
}

export async function deleteStageChangeAction(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return invalid();
  return run(() => repo.deleteStageChange(id));
}

// ---- Events ----------------------------------------------------------------

export async function saveEventAction(event: {
  id?: string;
  applicationId: string;
  type: EventType;
  date: string;
  title: string;
  notes: string;
}): Promise<ActionResult> {
  if (!isUuid(event?.applicationId) || (event.id !== undefined && !isUuid(event.id))) return invalid();
  if (!EVENT_TYPES.includes(event.type)) return invalid("Choose an event type.");
  if (!isValidDateOnly(event.date)) return invalid("Enter a valid date.");
  return run(() =>
    repo.saveEvent({
      id: event.id,
      applicationId: event.applicationId,
      type: event.type,
      date: event.date,
      title: str(event.title, 200).trim(),
      notes: str(event.notes, 20_000).trim(),
    }),
  );
}

export async function deleteEventAction(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return invalid();
  return run(() => repo.deleteEvent(id));
}

// ---- Categories ------------------------------------------------------------

export async function addCategoryAction(name: string): Promise<ActionResult<{ id: string; name: string; sortOrder: number }>> {
  return run(() => repo.addCategory(str(name, 200)));
}

export async function renameCategoryAction(id: string, name: string): Promise<ActionResult> {
  if (!isUuid(id)) return invalid();
  return run(() => repo.renameCategory(id, str(name, 200)));
}

export async function deleteCategoryAction(id: string): Promise<ActionResult<number>> {
  if (!isUuid(id)) return invalid();
  return run(() => repo.deleteCategory(id));
}

// ---- Data management -------------------------------------------------------

export async function loadSampleDataAction(): Promise<ActionResult<number>> {
  return run(loadSampleData);
}

export async function removeSampleDataAction(): Promise<ActionResult<number>> {
  return run(repo.removeSampleData);
}

export async function importCsvAction(
  text: string,
  mode: DuplicateMode,
): Promise<ActionResult<{ added: number; updated: number; skipped: number }>> {
  if (typeof text !== "string" || (mode !== "skip" && mode !== "overwrite")) return invalid();
  return run(() => repo.importCsv(text, mode));
}
