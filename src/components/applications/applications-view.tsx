"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { BriefcaseIcon, PlusIcon, SearchXIcon } from "lucide-react";
import { applyQuery, distinctLocations, paramsFromQuery, queryFromParams, type ApplicationQuery, type SortField } from "@/lib/application-query";
import type { Application, Category } from "@/lib/types";
import { ApplicationFilters } from "@/components/applications/application-filters";
import { ApplicationsTable } from "@/components/applications/applications-table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export function ApplicationsView({ applications, categories }: { applications: Application[]; categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filters live in the URL so they survive opening a record and coming back.
  const query = useMemo(() => queryFromParams(new URLSearchParams(searchParams.toString())), [searchParams]);
  const update = (patch: Partial<ApplicationQuery>) => {
    const qs = paramsFromQuery({ ...query, ...patch }).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const onSort = (field: SortField) => {
    const textField = field === "companyName" || field === "jobTitle";
    if (query.sort === field) update({ direction: query.direction === "asc" ? "desc" : "asc" });
    else update({ sort: field, direction: textField ? "asc" : "desc" });
  };

  const visible = useMemo(() => applyQuery(applications, query, categories), [applications, categories, query]);
  const locations = useMemo(() => distinctLocations(applications), [applications]);

  const addButton = (
    <Button asChild>
      <Link href="/applications/new">
        <PlusIcon aria-hidden />
        Add Application
      </Link>
    </Button>
  );

  if (applications.length === 0) {
    return (
      <>
        <PageHeader title="Applications" />
        <EmptyState
          icon={BriefcaseIcon}
          title="No applications yet"
          description="Add your first application to start tracking it, or import a CSV backup from Data & Settings."
        >
          {addButton}
          <Button asChild variant="outline">
            <Link href="/settings">Import or load sample data</Link>
          </Button>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Applications"
        description={
          visible.length === applications.length
            ? `${applications.length} application${applications.length === 1 ? "" : "s"}`
            : `Showing ${visible.length} of ${applications.length} applications`
        }
        actions={addButton}
      />
      <div className="space-y-4">
        <ApplicationFilters query={query} onChange={update} categories={categories} locations={locations} />
        {visible.length === 0 ? (
          <EmptyState icon={SearchXIcon} title="No matching applications" description="Try a different search term or clear some filters." />
        ) : (
          <ApplicationsTable applications={visible} categories={categories} query={query} onSort={onSort} />
        )}
      </div>
    </>
  );
}
