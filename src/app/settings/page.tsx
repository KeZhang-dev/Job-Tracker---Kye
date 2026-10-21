import { loadPageData } from "@/db/errors";
import { listApplications, listCategories } from "@/lib/repository";
import { PageHeader } from "@/components/layout/page-header";
import { DatabaseError } from "@/components/shared/database-error";
import { BackupCard } from "@/components/settings/backup-card";
import { CategoryManager } from "@/components/settings/category-manager";
import { DatabaseCard } from "@/components/settings/database-card";
import { LegacyImportCard } from "@/components/settings/legacy-import-card";
import { SampleDataCard } from "@/components/settings/sample-data-card";

export default async function SettingsPage() {
  const { data, error } = await loadPageData(async () => {
    const [applications, categories] = await Promise.all([listApplications(), listCategories()]);
    return { applications, categories };
  });

  return (
    <>
      <PageHeader title="Data & Settings" description="Back up your data, manage categories and sample records." />
      {error !== undefined ? (
        <div className="space-y-6">
          <DatabaseError message={error} />
          <DatabaseCard />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <LegacyImportCard applications={data.applications} />
            <DatabaseCard />
            <BackupCard applications={data.applications} />
            <SampleDataCard sampleCount={data.applications.filter((a) => a.isSample).length} />
          </div>
          <CategoryManager categories={data.categories} applications={data.applications} />
        </div>
      )}
    </>
  );
}
