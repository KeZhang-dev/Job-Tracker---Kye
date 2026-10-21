import {
  EMPLOYMENT_TYPES,
  SOURCES,
  STAGES,
  WORK_MODES,
  type EmploymentType,
  type Source,
  type Stage,
  type WorkMode,
} from "./constants";
import { isValidDateOnly, parseDateOnly } from "./dates";
import type { ApplicationInput } from "./types";

/** Raw form values: every field is a string while being edited. */
export interface ApplicationFormValues {
  companyName: string;
  jobTitle: string;
  categoryId: string;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  jobDescription: string;
  applicationDate: string;
  closingDate: string;
  source: Source;
  stage: Stage;
  followUpDate: string;
  notes: string;
}

export type FormErrors = Partial<Record<keyof ApplicationFormValues, string>>;

export const LIMITS = {
  companyName: 120,
  jobTitle: 200,
  location: 120,
  jobDescription: 100_000,
  notes: 20_000,
} as const;

export function validateApplication(
  values: ApplicationFormValues,
  validCategoryIds: Set<string>,
): { errors: FormErrors; input: ApplicationInput | null } {
  const errors: FormErrors = {};
  const companyName = values.companyName.trim();
  const jobTitle = values.jobTitle.trim();

  if (!companyName) errors.companyName = "Company name is required.";
  else if (companyName.length > LIMITS.companyName) errors.companyName = `Keep it under ${LIMITS.companyName} characters.`;

  if (!jobTitle) errors.jobTitle = "Job title is required.";
  else if (jobTitle.length > LIMITS.jobTitle) errors.jobTitle = `Keep it under ${LIMITS.jobTitle} characters.`;

  if (!validCategoryIds.has(values.categoryId)) errors.categoryId = "Choose a role category.";
  if (values.location.trim().length > LIMITS.location) errors.location = `Keep it under ${LIMITS.location} characters.`;
  if (!WORK_MODES.includes(values.workMode)) errors.workMode = "Choose a work mode.";
  if (!EMPLOYMENT_TYPES.includes(values.employmentType)) errors.employmentType = "Choose an employment type.";
  if (!SOURCES.includes(values.source)) errors.source = "Choose an application source.";
  if (!STAGES.includes(values.stage)) errors.stage = "Choose a recruitment stage.";

  if (!values.applicationDate) errors.applicationDate = "Application date is required.";
  for (const field of ["applicationDate", "closingDate", "followUpDate"] as const) {
    if (values[field] && !isValidDateOnly(values[field])) errors[field] = "Enter a valid date.";
  }
  const applied = parseDateOnly(values.applicationDate);
  if (applied && applied > new Date()) errors.applicationDate = "Application date can't be in the future.";
  const followUp = parseDateOnly(values.followUpDate);
  if (applied && followUp && followUp < applied) errors.followUpDate = "Follow-up should be on or after the application date.";

  if (values.jobDescription.length > LIMITS.jobDescription) errors.jobDescription = "Job description is too long.";
  if (values.notes.length > LIMITS.notes) errors.notes = "Notes are too long.";

  if (Object.keys(errors).length > 0) return { errors, input: null };

  return {
    errors,
    input: {
      companyName,
      jobTitle,
      categoryId: values.categoryId,
      location: values.location.trim(),
      workMode: values.workMode,
      employmentType: values.employmentType,
      jobDescription: values.jobDescription.trim(),
      applicationDate: values.applicationDate || null,
      closingDate: values.closingDate || null,
      source: values.source,
      stage: values.stage,
      followUpDate: values.followUpDate || null,
      notes: values.notes.trim(),
    },
  };
}
