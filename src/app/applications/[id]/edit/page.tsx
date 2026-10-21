"use client";

import { useParams } from "next/navigation";
import { useApplication, useCategories } from "@/hooks/use-data";
import { ApplicationForm } from "@/components/applications/application-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLoading } from "@/components/shared/loading";
import { ApplicationNotFound } from "@/components/shared/not-found-state";

export default function EditApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const application = useApplication(id);
  const categories = useCategories();

  if (application === null) return <ApplicationNotFound />;
  if (!application || !categories) return <PageLoading />;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Edit application" description={`${application.jobTitle} · ${application.companyName}`} />
      {/* key resets the form if a different record is loaded */}
      <ApplicationForm key={application.id} application={application} categories={categories} />
    </div>
  );
}
