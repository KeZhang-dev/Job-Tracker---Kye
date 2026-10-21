"use client";

import { useCategories } from "@/hooks/use-data";
import { ApplicationForm } from "@/components/applications/application-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLoading } from "@/components/shared/loading";

export default function NewApplicationPage() {
  const categories = useCategories();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Add application" description="Fields marked * are required. Everything else can be filled in later." />
      {categories ? <ApplicationForm categories={categories} /> : <PageLoading />}
    </div>
  );
}
