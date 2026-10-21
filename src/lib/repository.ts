// All database reads and writes go through this server-only module so
// invariants (timestamps, stage history, cascading deletes) live in one place.

import "server-only";

import { asc, eq, inArray, sql } from "drizzle-orm";
import { getDb, type Executor } from "@/db";
import { applications, categories, events, stageHistory } from "@/db/schema";
import { previewImport, type DuplicateMode } from "./csv";
import { FALLBACK_CATEGORY, type EmploymentType, type EventType, type Source, type Stage, type WorkMode } from "./constants";
import { isUuid, newId } from "./ids";
import type { Application, ApplicationEvent, ApplicationInput, Category, StageChange } from "./types";

// ---- Row mapping -----------------------------------------------------------

type ApplicationRow = typeof applications.$inferSelect;
type StageChangeRow = typeof stageHistory.$inferSelect;
type EventRow = typeof events.$inferSelect;

function toApplication(row: ApplicationRow): Application {
  return {
    ...row,
    workMode: row.workMode as WorkMode,
    employmentType: row.employmentType as EmploymentType,
    source: row.source as Source,
    stage: row.stage as Stage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toApplicationRow(app: Application): ApplicationRow {
  return { ...app, createdAt: new Date(app.createdAt), updatedAt: new Date(app.updatedAt) };
}

function toStageChange(row: StageChangeRow): StageChange {
  return { ...row, fromStage: row.fromStage as Stage | null, toStage: row.toStage as Stage, changedAt: row.changedAt.toISOString() };
}

function toEvent(row: EventRow): ApplicationEvent {
  return { ...row, type: row.type as EventType };
}

// ---- Reads -----------------------------------------------------------------

export async function listApplications(): Promise<Application[]> {
  return (await getDb().select().from(applications)).map(toApplication);
}

export async function getApplication(id: string): Promise<Application | null> {
  if (!isUuid(id)) return null;
  const [row] = await getDb().select().from(applications).where(eq(applications.id, id));
  return row ? toApplication(row) : null;
}

export async function listCategories(): Promise<Category[]> {
  return getDb().select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function listStageHistory(applicationId?: string): Promise<StageChange[]> {
  const query = getDb().select().from(stageHistory).orderBy(asc(stageHistory.changedAt));
  const rows = applicationId ? await query.where(eq(stageHistory.applicationId, applicationId)) : await query;
  return rows.map(toStageChange);
}

export async function listEvents(applicationId?: string): Promise<ApplicationEvent[]> {
  const query = getDb().select().from(events).orderBy(asc(events.date));
  const rows = applicationId ? await query.where(eq(events.applicationId, applicationId)) : await query;
  return rows.map(toEvent);
}

// ---- Applications ----------------------------------------------------------

export async function createApplication(input: ApplicationInput): Promise<string> {
  const id = newId();
  await getDb().transaction(async (tx) => {
    const now = new Date();
    await tx.insert(applications).values({ ...input, id, isSample: false, createdAt: now, updatedAt: now });
    await tx.insert(stageHistory).values({
      id: newId(),
      applicationId: id,
      fromStage: null,
      toStage: input.stage,
      changedAt: now,
      note: "Application created",
    });
  });
  return id;
}

/**
 * Saves edited fields. A stage history entry is written only when the stage
 * actually changed, so editing unrelated fields never creates false history.
 */
export async function updateApplication(id: string, input: ApplicationInput, stageNote = ""): Promise<void> {
  await getDb().transaction(async (tx) => {
    // Lock the row so concurrent saves can't both record the same stage change.
    const [existing] = await tx.select({ stage: applications.stage }).from(applications).where(eq(applications.id, id)).for("update");
    if (!existing) throw new UserFacingError("This application no longer exists.");
    const now = new Date();
    await tx.update(applications).set({ ...input, updatedAt: now }).where(eq(applications.id, id));
    if (existing.stage !== input.stage) {
      await tx.insert(stageHistory).values({
        id: newId(),
        applicationId: id,
        fromStage: existing.stage,
        toStage: input.stage,
        changedAt: now,
        note: stageNote,
      });
    }
  });
}

/** Moves an application to any stage (stages are not forced to be linear). */
export async function changeStage(id: string, toStage: Stage, options: { changedAt?: Date; note?: string } = {}) {
  await getDb().transaction(async (tx) => {
    const [existing] = await tx.select({ stage: applications.stage }).from(applications).where(eq(applications.id, id)).for("update");
    if (!existing) throw new UserFacingError("This application no longer exists.");
    if (existing.stage === toStage) return;
    const now = new Date();
    await tx.update(applications).set({ stage: toStage, updatedAt: now }).where(eq(applications.id, id));
    await tx.insert(stageHistory).values({
      id: newId(),
      applicationId: id,
      fromStage: existing.stage,
      toStage,
      changedAt: options.changedAt ?? now,
      note: options.note?.trim() ?? "",
    });
  });
}

/** Removes a mistaken history entry. The application's current stage is left untouched. */
export async function deleteStageChange(id: string) {
  await getDb().delete(stageHistory).where(eq(stageHistory.id, id));
}

/** History and events are removed by ON DELETE CASCADE. */
export async function deleteApplication(id: string) {
  await getDb().delete(applications).where(eq(applications.id, id));
}

export async function saveEvent(event: Omit<ApplicationEvent, "id"> & { id?: string }) {
  await getDb().transaction(async (tx) => {
    const [app] = await tx.select({ id: applications.id }).from(applications).where(eq(applications.id, event.applicationId));
    if (!app) throw new UserFacingError("This application no longer exists.");
    const values = { ...event, id: event.id ?? newId() };
    await tx.insert(events).values(values).onConflictDoUpdate({
      target: events.id,
      set: { type: values.type, date: values.date, title: values.title, notes: values.notes },
    });
    await tx.update(applications).set({ updatedAt: new Date() }).where(eq(applications.id, event.applicationId));
  });
}

export async function deleteEvent(id: string) {
  await getDb().delete(events).where(eq(events.id, id));
}

// ---- Categories ------------------------------------------------------------

/** An error whose message is safe and useful to show in the UI. */
export class UserFacingError extends Error {}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function validateCategoryName(rawName: string) {
  const name = normalizeName(rawName);
  if (!name) throw new UserFacingError("Category name is required.");
  if (name.length > 60) throw new UserFacingError("Category name must be 60 characters or fewer.");
  return name;
}

async function findCategoryByName(name: string, db: Executor = getDb()): Promise<Category | undefined> {
  const [row] = await db
    .select()
    .from(categories)
    .where(sql`lower(${categories.name}) = ${normalizeName(name).toLowerCase()}`);
  return row;
}

export async function addCategory(rawName: string, db: Executor = getDb()): Promise<Category> {
  const name = validateCategoryName(rawName);
  if (await findCategoryByName(name, db)) throw new UserFacingError(`"${name}" already exists.`);
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${categories.sortOrder}), -1)` }).from(categories);
  const [created] = await db.insert(categories).values({ id: newId(), name, sortOrder: Number(max) + 1 }).returning();
  return created;
}

export async function renameCategory(id: string, rawName: string) {
  const name = validateCategoryName(rawName);
  const clash = await findCategoryByName(name);
  if (clash && clash.id !== id) throw new UserFacingError(`"${name}" already exists.`);
  await getDb().update(categories).set({ name }).where(eq(categories.id, id));
}

/** Ensures a category exists (used by import, sample data and as a deletion fallback). */
export async function getOrCreateCategory(rawName: string, db: Executor = getDb()): Promise<Category> {
  const name = normalizeName(rawName) || FALLBACK_CATEGORY;
  return (await findCategoryByName(name, db)) ?? addCategory(name, db);
}

/** Deletes a category, moving any applications that use it to "Other". */
export async function deleteCategory(id: string): Promise<number> {
  return getDb().transaction(async (tx) => {
    const [category] = await tx.select().from(categories).where(eq(categories.id, id));
    if (!category) return 0;
    if (category.name.toLowerCase() === FALLBACK_CATEGORY.toLowerCase()) {
      throw new UserFacingError(`"${FALLBACK_CATEGORY}" is the fallback category and cannot be deleted.`);
    }
    const fallback = await getOrCreateCategory(FALLBACK_CATEGORY, tx);
    const moved = await tx
      .update(applications)
      .set({ categoryId: fallback.id })
      .where(eq(applications.categoryId, id))
      .returning({ id: applications.id });
    await tx.delete(categories).where(eq(categories.id, id));
    return moved.length;
  });
}

// ---- Bulk operations -------------------------------------------------------

export async function removeSampleData(): Promise<number> {
  const deleted = await getDb().delete(applications).where(eq(applications.isSample, true)).returning({ id: applications.id });
  return deleted.length;
}

export interface FullRecord {
  application: Application;
  history: StageChange[];
  events: ApplicationEvent[];
}

/** Inserts or replaces fully formed records (used by CSV import and sample data). */
export async function putApplicationsWithHistory(records: FullRecord[], db: Executor = getDb()) {
  if (records.length === 0) return;
  const run = async (tx: Executor) => {
    const ids = records.map((r) => r.application.id);
    // Replace any previous history/events for these ids so overwrites stay consistent.
    await tx.delete(stageHistory).where(inArray(stageHistory.applicationId, ids));
    await tx.delete(events).where(inArray(events.applicationId, ids));
    for (const { application } of records) {
      const row = toApplicationRow(application);
      // On overwrite keep the original id and creation time.
      const updatable: Partial<ApplicationRow> = { ...row };
      delete updatable.id;
      delete updatable.createdAt;
      await tx.insert(applications).values(row).onConflictDoUpdate({ target: applications.id, set: updatable });
    }
    const history = records.flatMap((r) => r.history).map((h) => ({ ...h, changedAt: new Date(h.changedAt) }));
    const allEvents = records.flatMap((r) => r.events);
    if (history.length) await tx.insert(stageHistory).values(history);
    if (allEvents.length) await tx.insert(events).values(allEvents);
  };
  // Join the caller's transaction if one was passed in; otherwise open our own.
  if (db === getDb()) await getDb().transaction(run);
  else await run(db);
}

/**
 * Imports CSV text. The file is re-validated here against the current database
 * (never trusting a client-side preview) and written in a single transaction.
 */
export async function importCsv(text: string, mode: DuplicateMode) {
  return getDb().transaction(async (tx) => {
    const existing = (await tx.select().from(applications)).map(toApplication);
    const preview = previewImport(text, existing);
    if (preview.rows.length === 0) throw new UserFacingError(preview.fileErrors[0] ?? "The file has no data rows.");

    const toWrite = preview.rows.filter((r) => r.status === "new" || (r.status === "duplicate" && mode === "overwrite"));
    const categoryIds = new Map<string, string>();
    const records: FullRecord[] = [];
    for (const row of toWrite) {
      const { application, categoryName, history, events: rowEvents } = row.record!;
      const key = categoryName.toLowerCase();
      if (!categoryIds.has(key)) categoryIds.set(key, (await getOrCreateCategory(categoryName, tx)).id);
      records.push({ application: { ...application, categoryId: categoryIds.get(key)! }, history, events: rowEvents });
    }
    await putApplicationsWithHistory(records, tx);

    const added = toWrite.filter((r) => r.status === "new").length;
    return { added, updated: toWrite.length - added, skipped: preview.rows.length - toWrite.length };
  });
}
