import { loadPageData } from "@/db/errors";
import { listApplications, listCategories, listEvents, listStageHistory } from "@/lib/repository";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DatabaseError } from "@/components/shared/database-error";

export default async function DashboardPage() {
  const { data, error } = await loadPageData(async () => {
    const [applications, categories, history, events] = await Promise.all([
      listApplications(),
      listCategories(),
      listStageHistory(),
      listEvents(),
    ]);
    return { applications, categories, history, events };
  });
  if (error !== undefined) return <DatabaseError message={error} />;
  return <DashboardView {...data} />;
}
