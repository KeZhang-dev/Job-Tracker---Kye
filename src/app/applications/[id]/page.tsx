"use client";

import { useParams } from "next/navigation";
import { useApplication, useCategories, useEvents, useStageHistory } from "@/hooks/use-data";
import { ApplicationDetail } from "@/components/applications/application-detail";
import { PageLoading } from "@/components/shared/loading";
import { ApplicationNotFound } from "@/components/shared/not-found-state";

export default function ApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const application = useApplication(id);
  const categories = useCategories();
  const history = useStageHistory(id);
  const events = useEvents(id);

  if (application === null) return <ApplicationNotFound />;
  if (!application || !categories || !history || !events) return <PageLoading />;

  return (
    <ApplicationDetail
      application={application}
      category={categories.find((c) => c.id === application.categoryId)}
      history={history}
      events={events}
    />
  );
}
