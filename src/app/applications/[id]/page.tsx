import { loadPageData } from "@/db/errors";
import { getApplication, listCategories, listEvents, listStageHistory } from "@/lib/repository";
import { ApplicationDetail } from "@/components/applications/application-detail";
import { DatabaseError } from "@/components/shared/database-error";
import { ApplicationNotFound } from "@/components/shared/not-found-state";

export default async function ApplicationPage({ params }: PageProps<"/applications/[id]">) {
  const { id } = await params;
  const { data, error } = await loadPageData(async () => {
    const application = await getApplication(id);
    if (!application) return null;
    const [categories, history, events] = await Promise.all([listCategories(), listStageHistory(id), listEvents(id)]);
    return { application, category: categories.find((c) => c.id === application.categoryId), history, events };
  });
  if (error !== undefined) return <DatabaseError message={error} />;
  if (!data) return <ApplicationNotFound />;
  return <ApplicationDetail {...data} />;
}
