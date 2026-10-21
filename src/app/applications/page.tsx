import { Suspense } from "react";
import { loadPageData } from "@/db/errors";
import { listApplications, listCategories } from "@/lib/repository";
import { ApplicationsView } from "@/components/applications/applications-view";
import { DatabaseError } from "@/components/shared/database-error";
import { PageLoading } from "@/components/shared/loading";

export default async function ApplicationsPage() {
  const { data, error } = await loadPageData(async () => {
    const [applications, categories] = await Promise.all([listApplications(), listCategories()]);
    return { applications, categories };
  });
  if (error !== undefined) return <DatabaseError message={error} />;
  return (
    // useSearchParams (filters in the URL) needs a Suspense boundary.
    <Suspense fallback={<PageLoading label="Loading applications…" />}>
      <ApplicationsView {...data} />
    </Suspense>
  );
}
