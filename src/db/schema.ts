// PostgreSQL schema. Allowed values for stage/source/etc. come from the same
// central constants the UI uses, enforced with CHECK constraints.

import { sql, type SQL } from "drizzle-orm";
import { boolean, check, date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { EMPLOYMENT_TYPES, EVENT_TYPES, SOURCES, STAGES, WORK_MODES } from "../lib/constants";

const oneOf = (column: AnyPgColumn, values: readonly string[]): SQL =>
  sql`${column} in (${sql.join(values.map((v) => sql.raw(`'${v}'`)), sql`, `)})`;

const timestamps = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("categories_name_lower_idx").on(sql`lower(${t.name})`)],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyName: text("company_name").notNull(),
    jobTitle: text("job_title").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    location: text("location").notNull().default(""),
    workMode: text("work_mode").notNull().default("not_specified"),
    employmentType: text("employment_type").notNull().default("full_time"),
    jobDescription: text("job_description").notNull().default(""),
    applicationDate: date("application_date", { mode: "string" }),
    closingDate: date("closing_date", { mode: "string" }),
    source: text("source").notNull().default("other"),
    stage: text("stage").notNull().default("applied"),
    followUpDate: date("follow_up_date", { mode: "string" }),
    notes: text("notes").notNull().default(""),
    isSample: boolean("is_sample").notNull().default(false),
    createdAt: timestamps("created_at").notNull().defaultNow(),
    updatedAt: timestamps("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("applications_category_idx").on(t.categoryId),
    index("applications_stage_idx").on(t.stage),
    index("applications_application_date_idx").on(t.applicationDate),
    check("applications_work_mode_check", oneOf(t.workMode, WORK_MODES)),
    check("applications_employment_type_check", oneOf(t.employmentType, EMPLOYMENT_TYPES)),
    check("applications_source_check", oneOf(t.source, SOURCES)),
    check("applications_stage_check", oneOf(t.stage, STAGES)),
  ],
);

export const stageHistory = pgTable(
  "stage_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    fromStage: text("from_stage"),
    toStage: text("to_stage").notNull(),
    changedAt: timestamps("changed_at").notNull(),
    note: text("note").notNull().default(""),
  },
  (t) => [
    index("stage_history_application_idx").on(t.applicationId),
    check("stage_history_from_stage_check", sql`${t.fromStage} is null or ${oneOf(t.fromStage, STAGES)}`),
    check("stage_history_to_stage_check", oneOf(t.toStage, STAGES)),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    title: text("title").notNull().default(""),
    notes: text("notes").notNull().default(""),
  },
  (t) => [index("events_application_idx").on(t.applicationId), check("events_type_check", oneOf(t.type, EVENT_TYPES))],
);
