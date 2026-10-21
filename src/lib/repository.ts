// All writes to IndexedDB go through this module so invariants (timestamps,
// stage history, cascading deletes) are enforced in one place.

import { db } from "./db";
import { FALLBACK_CATEGORY, type Stage } from "./constants";
import type { Application, ApplicationEvent, ApplicationInput, Category, StageChange } from "./types";

const newId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export async function createApplication(
  input: ApplicationInput,
  options: { isSample?: boolean; initialChangedAt?: string } = {},
): Promise<string> {
  const id = newId();
  const timestamp = now();
  await db.transaction("rw", db.applications, db.stageHistory, async () => {
    await db.applications.add({ ...input, id, isSample: options.isSample ?? false, createdAt: timestamp, updatedAt: timestamp });
    await db.stageHistory.add({
      id: newId(),
      applicationId: id,
      fromStage: null,
      toStage: input.stage,
      changedAt: options.initialChangedAt ?? timestamp,
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
  await db.transaction("rw", db.applications, db.stageHistory, async () => {
    const existing = await db.applications.get(id);
    if (!existing) throw new Error("This application no longer exists.");
    const timestamp = now();
    await db.applications.update(id, { ...input, updatedAt: timestamp });
    if (existing.stage !== input.stage) {
      await db.stageHistory.add({
        id: newId(),
        applicationId: id,
        fromStage: existing.stage,
        toStage: input.stage,
        changedAt: timestamp,
        note: stageNote,
      });
    }
  });
}

/** Moves an application to any stage (stages are not forced to be linear). */
export async function changeStage(id: string, toStage: Stage, options: { changedAt?: string; note?: string } = {}) {
  await db.transaction("rw", db.applications, db.stageHistory, async () => {
    const existing = await db.applications.get(id);
    if (!existing) throw new Error("This application no longer exists.");
    if (existing.stage === toStage) return;
    await db.applications.update(id, { stage: toStage, updatedAt: now() });
    await db.stageHistory.add({
      id: newId(),
      applicationId: id,
      fromStage: existing.stage,
      toStage,
      changedAt: options.changedAt ?? now(),
      note: options.note?.trim() ?? "",
    });
  });
}

/** Removes a mistaken history entry. The application's current stage is left untouched. */
export async function deleteStageChange(id: string) {
  await db.stageHistory.delete(id);
}

export async function deleteApplication(id: string) {
  await db.transaction("rw", db.applications, db.stageHistory, db.events, async () => {
    await db.stageHistory.where("applicationId").equals(id).delete();
    await db.events.where("applicationId").equals(id).delete();
    await db.applications.delete(id);
  });
}

export async function saveEvent(event: Omit<ApplicationEvent, "id"> & { id?: string }) {
  await db.transaction("rw", db.events, db.applications, async () => {
    await db.events.put({ ...event, id: event.id ?? newId() });
    await db.applications.update(event.applicationId, { updatedAt: now() });
  });
}

export async function deleteEvent(id: string) {
  await db.events.delete(id);
}

// ---- Categories ------------------------------------------------------------

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

async function findCategoryByName(name: string): Promise<Category | undefined> {
  const target = normalizeName(name).toLowerCase();
  return (await db.categories.toArray()).find((c) => c.name.toLowerCase() === target);
}

export async function addCategory(rawName: string): Promise<Category> {
  const name = normalizeName(rawName);
  if (!name) throw new Error("Category name is required.");
  if (name.length > 60) throw new Error("Category name must be 60 characters or fewer.");
  if (await findCategoryByName(name)) throw new Error(`"${name}" already exists.`);
  const last = await db.categories.orderBy("sortOrder").last();
  const category = { id: newId(), name, sortOrder: (last?.sortOrder ?? -1) + 1 };
  await db.categories.add(category);
  return category;
}

export async function renameCategory(id: string, rawName: string) {
  const name = normalizeName(rawName);
  if (!name) throw new Error("Category name is required.");
  if (name.length > 60) throw new Error("Category name must be 60 characters or fewer.");
  const clash = await findCategoryByName(name);
  if (clash && clash.id !== id) throw new Error(`"${name}" already exists.`);
  await db.categories.update(id, { name });
}

/** Ensures a category exists (used by import and as a deletion fallback). */
export async function getOrCreateCategory(rawName: string): Promise<Category> {
  const name = normalizeName(rawName) || FALLBACK_CATEGORY;
  return (await findCategoryByName(name)) ?? addCategory(name);
}

/** Deletes a category, moving any applications that use it to "Other". */
export async function deleteCategory(id: string): Promise<number> {
  return db.transaction("rw", db.categories, db.applications, async () => {
    const category = await db.categories.get(id);
    if (!category) return 0;
    if (category.name.toLowerCase() === FALLBACK_CATEGORY.toLowerCase()) {
      throw new Error(`"${FALLBACK_CATEGORY}" is the fallback category and cannot be deleted.`);
    }
    const fallback = await getOrCreateCategory(FALLBACK_CATEGORY);
    const moved = await db.applications.where("categoryId").equals(id).modify({ categoryId: fallback.id });
    await db.categories.delete(id);
    return moved;
  });
}

// ---- Bulk operations -------------------------------------------------------

export async function removeSampleData(): Promise<number> {
  return db.transaction("rw", db.applications, db.stageHistory, db.events, async () => {
    const ids = (await db.applications.toArray()).filter((a) => a.isSample).map((a) => a.id);
    await db.stageHistory.where("applicationId").anyOf(ids).delete();
    await db.events.where("applicationId").anyOf(ids).delete();
    await db.applications.bulkDelete(ids);
    return ids.length;
  });
}

/** Writes fully formed records (used by CSV import and sample data). */
export async function putApplicationsWithHistory(
  records: { application: Application; history: StageChange[]; events: ApplicationEvent[] }[],
) {
  await db.transaction("rw", db.applications, db.stageHistory, db.events, async () => {
    for (const { application, history, events } of records) {
      // Replace any previous history/events for this id so overwrites stay consistent.
      await db.stageHistory.where("applicationId").equals(application.id).delete();
      await db.events.where("applicationId").equals(application.id).delete();
      await db.applications.put(application);
      await db.stageHistory.bulkPut(history);
      await db.events.bulkPut(events);
    }
  });
}

export { newId };
