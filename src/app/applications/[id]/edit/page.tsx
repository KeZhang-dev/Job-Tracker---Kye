import { loadPageData } from "@/db/errors";
import { getApplication, listCategories } from "@/lib/repository";
import { ApplicationForm } from "@/components/applications/application-form";
import { PageHeader } from "@/components/layout/page-header";
import { DatabaseError } from "@/components/shared/database-error";
import { ApplicationNotFound } from "@/components/shared/not-found-state";

export default async function EditApplicationPage({ params }: PageProps<"/applications/[id]/edit">) {
  const { id } = await params;
  const { data, error } = await loadPageData(async () => {
    const [application, categories] = await Promise.all([getApplication(id), listCategories()]);
    return application ? { application, categories } : null;
  });
  if (error !== undefined) return <DatabaseError message={error} />;
  if (!data) return <ApplicationNotFound />;

  const { application, categories } = data;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Edit application" description={`${application.jobTitle} · ${application.companyName}`} />
      {/* key resets the form if a different record is loaded */}
      <ApplicationForm key={application.id} application={application} categories={categories} />
    </div>
  );
}
