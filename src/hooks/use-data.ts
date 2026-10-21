"use client";

// Live IndexedDB queries. Each hook returns `undefined` while loading (and
// during server rendering), then re-renders automatically whenever the
// underlying tables change — which keeps the dashboard instantly in sync.

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export function useApplications() {
  return useLiveQuery(() => db.applications.toArray(), []);
}

export function useApplication(id: string) {
  // Resolve to null (not undefined) when missing so callers can tell "not found" from "loading".
  return useLiveQuery(async () => (await db.applications.get(id)) ?? null, [id]);
}

export function useCategories() {
  return useLiveQuery(() => db.categories.orderBy("sortOrder").toArray(), []);
}

export function useStageHistory(applicationId?: string) {
  return useLiveQuery(
    () =>
      applicationId
        ? db.stageHistory.where("applicationId").equals(applicationId).sortBy("changedAt")
        : db.stageHistory.toArray(),
    [applicationId],
  );
}

export function useEvents(applicationId?: string) {
  return useLiveQuery(
    () => (applicationId ? db.events.where("applicationId").equals(applicationId).sortBy("date") : db.events.toArray()),
    [applicationId],
  );
}
