"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LayoutDashboardIcon, PlusIcon } from "lucide-react";
import { differenceInCalendarWeeks } from "date-fns";
import {
  applicationTrend,
  computeSummary,
  filterByDateRange,
  pipelineCounts,
  resolveRange,
  roleDistribution,
  sourceDistribution,
  type DateFilter,
  type TrendGranularity,
} from "@/lib/metrics";
import { parseDateOnly } from "@/lib/dates";
import type { Application, ApplicationEvent, Category, StageChange } from "@/lib/types";
import { BarListChart } from "@/components/dashboard/bar-list-chart";
import { ChartCard, ChartEmpty } from "@/components/dashboard/chart-card";
import { ConversionMetrics } from "@/components/dashboard/conversion-metrics";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export function DashboardView({
  applications,
  categories,
  history,
  events,
}: {
  applications: Application[];
  categories: Category[];
  history: StageChange[];
  events: ApplicationEvent[];
}) {
  const [dateFilter, setDateFilter] = useState<DateFilter>({ preset: "all" });
  const [granularityChoice, setGranularityChoice] = useState<TrendGranularity | null>(null);

  const data = useMemo(() => {
    const range = resolveRange(dateFilter);
    const apps = filterByDateRange(applications, range);
    const ids = new Set(apps.map((a) => a.id));
    const appHistory = history.filter((h) => ids.has(h.applicationId));
    const appEvents = events.filter((e) => ids.has(e.applicationId));

    // Default to weekly buckets for short spans, monthly for long ones.
    const dated = apps.map((a) => parseDateOnly(a.applicationDate)).filter((d): d is Date => d !== null);
    const first = range.from ?? (dated.length ? new Date(Math.min(...dated.map(Number))) : new Date());
    const last = range.to ?? (dated.length ? new Date(Math.max(...dated.map(Number))) : new Date());
    const autoGranularity: TrendGranularity = differenceInCalendarWeeks(last, first) > 16 ? "month" : "week";
    const granularity = granularityChoice ?? autoGranularity;

    return {
      apps,
      granularity,
      summary: computeSummary(apps, appHistory, appEvents),
      roles: roleDistribution(apps, categories),
      sources: sourceDistribution(apps),
      pipeline: pipelineCounts(apps),
      trend: applicationTrend(apps, granularity, range),
    };
  }, [applications, categories, history, events, dateFilter, granularityChoice]);

  if (applications.length === 0) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <EmptyState
          icon={LayoutDashboardIcon}
          title="Your job search dashboard"
          description="Once you add applications, this page shows your pipeline, response rates, sources and activity over time."
        >
          <Button asChild>
            <Link href="/applications/new">
              <PlusIcon aria-hidden />
              Add your first application
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/settings">Import CSV or try sample data</Link>
          </Button>
        </EmptyState>
      </>
    );
  }

  const noneInRange = data.apps.length === 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={noneInRange ? "No applications in the selected period." : `Based on ${data.summary.total} application${data.summary.total === 1 ? "" : "s"} in the selected period.`}
        actions={<DateRangeFilter value={dateFilter} onChange={setDateFilter} />}
      />

      <div className="space-y-6">
        <SummaryCards summary={data.summary} />
        <ConversionMetrics summary={data.summary} />

        <div className="grid gap-6 xl:grid-cols-2">
          <ChartCard title="Applications by role category" description="Count and share of applications in each category.">
            {noneInRange ? <ChartEmpty /> : <BarListChart rows={data.roles} labelWidth={170} caption="Applications by role category" />}
          </ChartCard>
          <ChartCard title="Application sources" description="Where you found and applied for each role.">
            {noneInRange ? <ChartEmpty /> : <BarListChart rows={data.sources} labelWidth={150} caption="Applications by source" />}
          </ChartCard>
        </div>

        <PipelineChart counts={data.pipeline} />

        <TrendChart
          points={data.trend.points}
          undated={data.trend.undated}
          granularity={data.granularity}
          onGranularityChange={setGranularityChoice}
        />
      </div>
    </>
  );
}
