"use client";

import type { DateFilter, DatePreset } from "@/lib/metrics";
import { todayDateOnly } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "custom", label: "Custom" },
];

export function DateRangeFilter({ value, onChange }: { value: DateFilter; onChange: (value: DateFilter) => void }) {
  const invalidRange = value.preset === "custom" && value.from && value.to && value.from > value.to;

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div role="group" aria-label="Date range" className="inline-flex rounded-lg bg-muted p-0.5">
        {PRESETS.map((p) => {
          const selected = value.preset === p.value;
          return (
            <button
              key={p.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange({ ...value, preset: p.value })}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                selected && "bg-card text-foreground shadow-sm",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {value.preset === "custom" && (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="range-from" className="mb-1 text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="range-from"
              type="date"
              className="h-8 w-40 bg-card"
              value={value.from ?? ""}
              max={value.to || todayDateOnly()}
              onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
            />
          </div>
          <div>
            <Label htmlFor="range-to" className="mb-1 text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="range-to"
              type="date"
              className="h-8 w-40 bg-card"
              value={value.to ?? ""}
              min={value.from}
              aria-invalid={invalidRange ? true : undefined}
              onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
            />
          </div>
          {invalidRange && (
            <p role="alert" className="w-full text-xs text-destructive sm:text-right">
              The start date is after the end date.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
