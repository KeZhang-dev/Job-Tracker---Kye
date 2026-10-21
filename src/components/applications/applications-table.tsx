"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, PencilIcon } from "lucide-react";
import { SOURCE_LABELS, WORK_MODE_LABELS, isTerminalStage } from "@/lib/constants";
import { formatDate, formatTimestamp, formatTimestampDate, parseDateOnly } from "@/lib/dates";
import type { ApplicationQuery, SortField } from "@/lib/application-query";
import type { Application, Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StageBadge } from "@/components/shared/stage-badge";
import { DeleteApplicationButton } from "./delete-application-button";

function SortHeader({
  field,
  label,
  query,
  onSort,
  className,
}: {
  field: SortField;
  label: string;
  query: ApplicationQuery;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const active = query.sort === field;
  const Icon = !active ? ArrowUpDownIcon : query.direction === "asc" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <TableHead className={className} aria-sort={active ? (query.direction === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "-ml-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon className="size-3.5" aria-hidden />
      </button>
    </TableHead>
  );
}

function ClosingDate({ value, stageIsTerminal }: { value: string | null; stageIsTerminal: boolean }) {
  const date = parseDateOnly(value);
  if (!date) return <span className="text-muted-foreground">—</span>;
  const days = Math.ceil((date.getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  const soon = !stageIsTerminal && days >= 0 && days <= 3;
  return (
    <span className={cn(soon && "font-medium text-amber-700")}>
      {formatDate(value)}
      {soon && <span className="sr-only"> (closing soon)</span>}
    </span>
  );
}

export function ApplicationsTable({
  applications,
  categories,
  query,
  onSort,
}: {
  applications: Application[];
  categories: Category[];
  query: ApplicationQuery;
  onSort: (field: SortField) => void;
}) {
  const router = useRouter();
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 [&_[data-slot=table-container]]:rounded-xl">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <SortHeader field="jobTitle" label="Role" query={query} onSort={onSort} className="min-w-56 pl-4" />
            <SortHeader field="companyName" label="Company" query={query} onSort={onSort} className="hidden md:table-cell" />
            <TableHead>Stage</TableHead>
            <TableHead className="hidden 2xl:table-cell">Category</TableHead>
            <TableHead className="hidden xl:table-cell">Source</TableHead>
            <SortHeader field="applicationDate" label="Applied" query={query} onSort={onSort} />
            <SortHeader field="closingDate" label="Closes" query={query} onSort={onSort} className="hidden lg:table-cell" />
            <SortHeader field="updatedAt" label="Updated" query={query} onSort={onSort} className="hidden 2xl:table-cell" />
            <TableHead className="w-0 pr-4 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((app) => {
            const href = `/applications/${app.id}`;
            return (
              <TableRow key={app.id} className="cursor-pointer" onClick={() => router.push(href)}>
                <TableCell className="max-w-72 min-w-48 pl-4 whitespace-normal">
                  <Link
                    href={href}
                    className="font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {app.jobTitle}
                  </Link>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    <span className="md:hidden">{app.companyName} · </span>
                    {[app.location, app.workMode !== "not_specified" ? WORK_MODE_LABELS[app.workMode] : ""].filter(Boolean).join(" · ") || "No location"}
                    {app.isSample && (
                      <Badge variant="outline" className="ml-1.5 h-4 px-1.5 text-[10px]">
                        Sample
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden max-w-44 truncate md:table-cell" title={app.companyName}>{app.companyName}</TableCell>
                <TableCell>
                  <StageBadge stage={app.stage} />
                </TableCell>
                <TableCell className="hidden text-muted-foreground 2xl:table-cell">{categoryNames.get(app.categoryId) ?? "—"}</TableCell>
                <TableCell className="hidden text-muted-foreground xl:table-cell">{SOURCE_LABELS[app.source]}</TableCell>
                <TableCell className="tabular-nums">{formatDate(app.applicationDate)}</TableCell>
                <TableCell className="hidden tabular-nums lg:table-cell">
                  <ClosingDate value={app.closingDate} stageIsTerminal={isTerminalStage(app.stage)} />
                </TableCell>
                <TableCell className="hidden text-muted-foreground tabular-nums 2xl:table-cell">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>{formatTimestampDate(app.updatedAt)}</span>
                    </TooltipTrigger>
                    <TooltipContent>{formatTimestamp(app.updatedAt)}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="pr-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-0.5">
                    <Button asChild variant="ghost" size="icon-sm">
                      <Link href={`${href}/edit`} aria-label={`Edit ${app.jobTitle} at ${app.companyName}`}>
                        <PencilIcon />
                      </Link>
                    </Button>
                    <DeleteApplicationButton application={app} iconOnly />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
