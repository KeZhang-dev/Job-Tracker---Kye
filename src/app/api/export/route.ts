import { describeError } from "@/db/errors";
import { buildExportCsv } from "@/lib/csv";
import { todayDateOnly } from "@/lib/dates";
import { listApplications, listCategories, listEvents, listStageHistory } from "@/lib/repository";

export const dynamic = "force-dynamic";

/** GET /api/export: full CSV backup of every application. */
export async function GET() {
  try {
    const [apps, categories, history, events] = await Promise.all([
      listApplications(),
      listCategories(),
      listStageHistory(),
      listEvents(),
    ]);
    apps.sort((a, b) => (b.applicationDate ?? "").localeCompare(a.applicationDate ?? ""));
    // BOM so Excel opens UTF-8 (e.g. macrons in Māori place names) correctly.
    return new Response("﻿" + buildExportCsv(apps, categories, history, events), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="job-applications-${todayDateOnly()}.csv"`,
        "Cache-Control": "no-store",
        "X-Record-Count": String(apps.length),
      },
    });
  } catch (err) {
    return new Response(describeError(err), { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
