// Central definitions for every enumeration used by the app. UI labels, CSV
// import/export and metrics all read from here so the values stay consistent.

export const ACTIVE_STAGES = [
  "applied",
  "phone_screen",
  "online_assessment",
  "first_interview",
  "second_interview",
  "technical_interview",
  "reference_check",
  "offer",
] as const;

export const TERMINAL_STAGES = [
  "rejected",
  "withdrawn",
  "no_response",
  "position_closed",
] as const;

export const STAGES = [...ACTIVE_STAGES, ...TERMINAL_STAGES] as const;

export type ActiveStage = (typeof ACTIVE_STAGES)[number];
export type TerminalStage = (typeof TERMINAL_STAGES)[number];
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  applied: "Applied",
  phone_screen: "Phone Screen",
  online_assessment: "Online Assessment",
  first_interview: "First Interview",
  second_interview: "Second Interview",
  technical_interview: "Technical Interview",
  reference_check: "Reference Check",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  no_response: "No Response",
  position_closed: "Position Closed",
};

/** Stages that count as "an interview" for interview metrics. */
export const INTERVIEW_STAGES: readonly Stage[] = [
  "first_interview",
  "second_interview",
  "technical_interview",
];

export function isTerminalStage(stage: Stage): stage is TerminalStage {
  return (TERMINAL_STAGES as readonly string[]).includes(stage);
}

export function isInterviewStage(stage: Stage): boolean {
  return INTERVIEW_STAGES.includes(stage);
}

export const WORK_MODES = ["on_site", "hybrid", "remote", "not_specified"] as const;
export type WorkMode = (typeof WORK_MODES)[number];
export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  on_site: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
  not_specified: "Not Specified",
};

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "casual",
  "internship",
  "other",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  casual: "Casual",
  internship: "Internship",
  other: "Other",
};

export const SOURCES = [
  "linkedin",
  "seek",
  "trade_me",
  "company_website",
  "recruiter",
  "referral",
  "other",
] as const;
export type Source = (typeof SOURCES)[number];
export const SOURCE_LABELS: Record<Source, string> = {
  linkedin: "LinkedIn",
  seek: "SEEK",
  trade_me: "Trade Me",
  company_website: "Company Website",
  recruiter: "Recruiter",
  referral: "Referral",
  other: "Other",
};

/** Kinds of interview / assessment events that can be logged per application. */
export const EVENT_TYPES = [
  "phone_screen",
  "online_assessment",
  "interview",
  "technical_interview",
  "other",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  phone_screen: "Phone Screen",
  online_assessment: "Online Assessment",
  interview: "Interview",
  technical_interview: "Technical Interview",
  other: "Other",
};
export const INTERVIEW_EVENT_TYPES: readonly EventType[] = ["interview", "technical_interview"];

export const DEFAULT_CATEGORIES = [
  "Backend Developer",
  "Frontend Developer",
  "Full-stack Developer",
  "QA Engineer",
  "QA Automation Engineer",
  "AI Engineer",
  "DevOps Engineer",
  "Other",
] as const;

export const FALLBACK_CATEGORY = "Other";
