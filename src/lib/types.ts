import type { EmploymentType, EventType, Source, Stage, WorkMode } from "./constants";

/** Date-only values are stored as "YYYY-MM-DD"; timestamps as ISO 8601 strings. */
export type DateOnly = string;
export type IsoTimestamp = string;

export interface Application {
  id: string;
  companyName: string;
  jobTitle: string;
  categoryId: string;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  jobUrl: string;
  jobDescription: string;
  applicationDate: DateOnly | null;
  closingDate: DateOnly | null;
  source: Source;
  /** Current stage. History lives in the separate `stageHistory` table. */
  stage: Stage;
  followUpDate: DateOnly | null;
  notes: string;
  /** True for development sample records, so they can be removed in one go. */
  isSample: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** Fields the user edits directly; everything else is managed by the repository. */
export type ApplicationInput = Omit<Application, "id" | "isSample" | "createdAt" | "updatedAt">;

export interface StageChange {
  id: string;
  applicationId: string;
  /** null for the initial entry recorded when the application is created. */
  fromStage: Stage | null;
  toStage: Stage;
  changedAt: IsoTimestamp;
  note: string;
}

export interface ApplicationEvent {
  id: string;
  applicationId: string;
  type: EventType;
  date: DateOnly;
  title: string;
  notes: string;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}
