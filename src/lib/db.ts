import Dexie, { type EntityTable } from "dexie";
import { DEFAULT_CATEGORIES } from "./constants";
import type { Application, ApplicationEvent, Category, StageChange } from "./types";

export class JobTrackerDB extends Dexie {
  applications!: EntityTable<Application, "id">;
  stageHistory!: EntityTable<StageChange, "id">;
  events!: EntityTable<ApplicationEvent, "id">;
  categories!: EntityTable<Category, "id">;

  constructor() {
    super("job-tracker");
    this.version(1).stores({
      applications: "id, companyName, jobTitle, categoryId, stage, source, applicationDate, updatedAt",
      stageHistory: "id, applicationId, changedAt",
      events: "id, applicationId, date",
      categories: "id, &name, sortOrder",
    });

    this.on("populate", (tx) => {
      tx.table("categories").bulkAdd(
        DEFAULT_CATEGORIES.map((name, i) => ({ id: crypto.randomUUID(), name, sortOrder: i })),
      );
    });
  }
}

export const db = new JobTrackerDB();
