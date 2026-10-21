import { loadPageData } from "@/db/errors";
import { listCategories } from "@/lib/repository";
import { ApplicationForm } from "@/components/applications/application-form";
import { PageHeader } from "@/components/layout/page-header";
import { DatabaseError } from "@/components/shared/database-error";

export default async function NewApplicationPage() {
  const { data: categories, error } = await loadPageData(listCategories);
  if (error !== undefined) return <DatabaseError message={error} />;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Add application" description="Fields marked * are required. Everything else can be filled in later." />
      <ApplicationForm categories={categories} />
    </div>
  );
}
