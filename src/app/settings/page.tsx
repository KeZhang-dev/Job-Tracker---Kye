"use client";

import { useApplications, useCategories } from "@/hooks/use-data";
import { PageHeader } from "@/components/layout/page-header";
import { PageLoading } from "@/components/shared/loading";
import { BackupCard } from "@/components/settings/backup-card";
import { CategoryManager } from "@/components/settings/category-manager";
import { SampleDataCard } from "@/components/settings/sample-data-card";
import { StorageCard } from "@/components/settings/storage-card";

export default function SettingsPage() {
  const applications = useApplications();
  const categories = useCategories();

  if (!applications || !categories) return <PageLoading label="Loading settings…" />;

  return (
    <>
      <PageHeader title="Data & Settings" description="Back up your data, manage categories and sample records." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <StorageCard />
          <BackupCard applicationCount={applications.length} />
          <SampleDataCard sampleCount={applications.filter((a) => a.isSample).length} />
        </div>
        <CategoryManager categories={categories} applications={applications} />
      </div>
    </>
  );
}
