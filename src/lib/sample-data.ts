// Clearly labelled sample records for trying the app out. They are flagged with
// `isSample: true` and can be removed from Settings in one click.

import "server-only";

import { addDays, subDays } from "date-fns";
import { getDb } from "@/db";
import type { EmploymentType, EventType, Source, Stage, WorkMode } from "./constants";
import { toDateOnly } from "./dates";
import { newId } from "./ids";
import { getOrCreateCategory, putApplicationsWithHistory, type FullRecord } from "./repository";
import type { Application, ApplicationEvent, StageChange } from "./types";

interface SampleSpec {
  company: string;
  title: string;
  category: string;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  source: Source;
  daysAgo: number;
  /** Stages visited in order; the last one is the current stage. */
  path: Stage[];
  events?: { type: EventType; afterDays: number; title: string }[];
}

const SPECS: SampleSpec[] = [
  { company: "Sample Co — Harbour Analytics", title: "Junior Backend Developer (Node.js)", category: "Backend Developer", location: "Auckland", workMode: "hybrid", employmentType: "full_time", source: "seek", daysAgo: 150, path: ["applied", "phone_screen", "first_interview", "technical_interview", "offer"], events: [{ type: "interview", afterDays: 12, title: "Hiring manager interview" }, { type: "technical_interview", afterDays: 20, title: "Live coding session" }] },
  { company: "Sample Co — Fern Software", title: "Graduate Frontend Engineer", category: "Frontend Developer", location: "Wellington", workMode: "on_site", employmentType: "full_time", source: "linkedin", daysAgo: 130, path: ["applied", "online_assessment", "rejected"], events: [{ type: "online_assessment", afterDays: 6, title: "HackerRank test" }] },
  { company: "Sample Co — Kauri Health", title: "Full Stack Developer", category: "Full-stack Developer", location: "Auckland", workMode: "hybrid", employmentType: "full_time", source: "company_website", daysAgo: 110, path: ["applied", "no_response"] },
  { company: "Sample Co — Southern Logistics", title: "QA Engineer", category: "QA Engineer", location: "Christchurch", workMode: "on_site", employmentType: "contract", source: "recruiter", daysAgo: 95, path: ["applied", "phone_screen", "first_interview", "rejected"], events: [{ type: "interview", afterDays: 10, title: "Panel interview" }] },
  { company: "Sample Co — Tui Payments", title: "Test Automation Engineer (Playwright)", category: "QA Automation Engineer", location: "Remote, NZ", workMode: "remote", employmentType: "full_time", source: "trade_me", daysAgo: 70, path: ["applied", "online_assessment", "first_interview", "second_interview"], events: [{ type: "online_assessment", afterDays: 4, title: "Take-home task" }, { type: "interview", afterDays: 14, title: "First round" }, { type: "interview", afterDays: 24, title: "Second round" }] },
  { company: "Sample Co — Pohutukawa AI", title: "Junior AI Engineer", category: "AI Engineer", location: "Auckland", workMode: "hybrid", employmentType: "full_time", source: "referral", daysAgo: 45, path: ["applied", "phone_screen"] },
  { company: "Sample Co — Alpine Cloud", title: "Junior DevOps Engineer", category: "DevOps Engineer", location: "Wellington", workMode: "hybrid", employmentType: "full_time", source: "seek", daysAgo: 30, path: ["applied", "withdrawn"] },
  { company: "Sample Co — Rata Retail", title: "Software Developer", category: "Backend Developer", location: "Hamilton", workMode: "not_specified", employmentType: "full_time", source: "linkedin", daysAgo: 20, path: ["applied", "technical_interview"], events: [{ type: "technical_interview", afterDays: 9, title: "System design chat" }] },
  { company: "Sample Co — Kea Games", title: "Frontend Developer (React)", category: "Frontend Developer", location: "Dunedin", workMode: "remote", employmentType: "contract", source: "linkedin", daysAgo: 12, path: ["applied"] },
  { company: "Sample Co — Matai Energy", title: "Graduate Software Engineer", category: "Full-stack Developer", location: "Auckland", workMode: "on_site", employmentType: "full_time", source: "company_website", daysAgo: 5, path: ["applied", "position_closed"] },
];

export async function loadSampleData(): Promise<number> {
  return getDb().transaction(async (tx) => {
    const today = new Date();
    const records: FullRecord[] = [];
    for (const spec of SPECS) {
      const id = newId();
      const applied = subDays(today, spec.daysAgo);
      const category = await getOrCreateCategory(spec.category, tx);
      // Space stage changes out without letting any land in the future.
      const step = Math.min(7, Math.floor(spec.daysAgo / spec.path.length));
      const history: StageChange[] = spec.path.map((stage, i) => ({
        id: newId(),
        applicationId: id,
        fromStage: i === 0 ? null : spec.path[i - 1],
        toStage: stage,
        changedAt: addDays(applied, i * step).toISOString(),
        note: i === 0 ? "Sample data" : "",
      }));
      const events: ApplicationEvent[] = (spec.events ?? []).map((e) => ({
        id: newId(),
        applicationId: id,
        type: e.type,
        date: toDateOnly(addDays(applied, e.afterDays)),
        title: e.title,
        notes: "",
      }));
      const application: Application = {
        id,
        companyName: spec.company,
        jobTitle: spec.title,
        categoryId: category.id,
        location: spec.location,
        workMode: spec.workMode,
        employmentType: spec.employmentType,
        jobUrl: "",
        jobDescription: "This is sample data created for demonstration purposes. Remove it from Settings → Sample data.",
        applicationDate: toDateOnly(applied),
        closingDate: toDateOnly(addDays(applied, 14)),
        source: spec.source,
        stage: spec.path[spec.path.length - 1],
        followUpDate: null,
        notes: "Sample record — not a real application.",
        isSample: true,
        createdAt: applied.toISOString(),
        updatedAt: history[history.length - 1].changedAt,
      };
      records.push({ application, history, events });
    }
    await putApplicationsWithHistory(records, tx);
    return records.length;
  });
}
