"use client";

import type { DateFilter, DatePreset } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "180d", label: "Last 180 days" },
];

export function DateRangeFilter({ value, onChange }: { value: DateFilter; onChange: (value: DateFilter) => void }) {
  return (
    <div role="group" aria-label="Date range" className="inline-flex max-w-full overflow-x-auto rounded-lg bg-muted p-0.5">
      {PRESETS.map((p) => {
        const selected = value.preset === p.value;
        return (
          <button
            key={p.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange({ preset: p.value })}
            className={cn(
              "rounded-md px-3 py-1.5 text-[15px] font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              selected && "bg-card text-foreground shadow-sm",
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
