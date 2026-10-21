"use client";

import { useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import {
  ACTIVE_STAGES,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  SOURCES,
  SOURCE_LABELS,
  STAGE_LABELS,
  TERMINAL_STAGES,
  WORK_MODES,
  WORK_MODE_LABELS,
} from "@/lib/constants";
import { activeFilterCount, type ApplicationQuery } from "@/lib/application-query";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all";

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  children: React.ReactNode;
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
      <SelectTrigger aria-label={`Filter by ${label.toLowerCase()}`} className="h-8 w-full bg-card data-[active=true]:border-foreground/40 sm:w-auto sm:min-w-36" data-active={value !== null}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        <SelectSeparator />
        {children}
      </SelectContent>
    </Select>
  );
}

export function ApplicationFilters({
  query,
  onChange,
  categories,
  locations,
}: {
  query: ApplicationQuery;
  onChange: (patch: Partial<ApplicationQuery>) => void;
  categories: Category[];
  locations: string[];
}) {
  const filterCount = activeFilterCount(query);
  // Local copy keeps typing responsive while the URL catches up.
  const [searchText, setSearchText] = useState(query.search);

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          aria-label="Search by company or job title"
          placeholder="Search company or job title…"
          className="h-9 bg-card pl-8"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            onChange({ search: e.target.value });
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="group" aria-label="Filters">
        <FilterSelect label="Stages" value={query.stage} onChange={(v) => onChange({ stage: v as ApplicationQuery["stage"] })}>
          <SelectItem value="active">All active</SelectItem>
          <SelectItem value="terminal">All closed outcomes</SelectItem>
          <SelectGroup>
            <SelectLabel>Active stages</SelectLabel>
            {ACTIVE_STAGES.map((s) => (
              <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Outcomes</SelectLabel>
            {TERMINAL_STAGES.map((s) => (
              <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
            ))}
          </SelectGroup>
        </FilterSelect>
        <FilterSelect label="Categories" value={query.categoryId} onChange={(v) => onChange({ categoryId: v })}>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect label="Sources" value={query.source} onChange={(v) => onChange({ source: v as ApplicationQuery["source"] })}>
          {SOURCES.map((s) => (
            <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect label="Locations" value={query.location} onChange={(v) => onChange({ location: v })}>
          {locations.length === 0 ? (
            <SelectItem value="__none" disabled>No locations recorded</SelectItem>
          ) : (
            locations.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))
          )}
        </FilterSelect>
        <FilterSelect label="Work modes" value={query.workMode} onChange={(v) => onChange({ workMode: v as ApplicationQuery["workMode"] })}>
          {WORK_MODES.map((m) => (
            <SelectItem key={m} value={m}>{WORK_MODE_LABELS[m]}</SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect label="Employment types" value={query.employmentType} onChange={(v) => onChange({ employmentType: v as ApplicationQuery["employmentType"] })}>
          {EMPLOYMENT_TYPES.map((t) => (
            <SelectItem key={t} value={t}>{EMPLOYMENT_TYPE_LABELS[t]}</SelectItem>
          ))}
        </FilterSelect>
        {(filterCount > 0 || searchText) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => {
              setSearchText("");
              onChange({ search: "", categoryId: null, stage: null, location: null, workMode: null, employmentType: null, source: null });
            }}
          >
            <XIcon aria-hidden />
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}
