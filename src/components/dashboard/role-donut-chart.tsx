"use client";

import { Pie, PieChart, Tooltip } from "recharts";
import { FALLBACK_CATEGORY } from "@/lib/constants";
import { formatPercent, type DistributionRow } from "@/lib/metrics";
import type { Category } from "@/lib/types";

/**
 * Fixed categorical order (validated palette); a 9th hue is never generated.
 * Light/dark steps live in globals.css; the hex fallbacks are the light steps.
 */
const CATEGORY_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"].map(
  (hex, i) => `var(--cat-${i + 1}, ${hex})`,
);
const OTHER_COLOR = "var(--series-muted, #9ba4b2)";
const OTHER_KEY = "__other";

interface Slice extends DistributionRow {
  fill: string;
}

/**
 * Colour follows the category, never its rank, so a date filter doesn't repaint
 * slices: categories that have any application (across all time) take colours in
 * category-list order. "Other", uncategorised rows and anything past the eighth
 * colour fold into one gray "Other" slice.
 */
function toSlices(rows: DistributionRow[], categories: Category[], usedCategoryIds: Set<string>): Slice[] {
  const colorById = new Map(
    categories
      .filter((c) => usedCategoryIds.has(c.id) && c.name.toLowerCase() !== FALLBACK_CATEGORY.toLowerCase())
      .slice(0, CATEGORY_COLORS.length)
      .map((c, i) => [c.id, CATEGORY_COLORS[i]]),
  );
  const slices: Slice[] = [];
  let other: Slice | null = null;
  for (const row of rows) {
    const fill = colorById.get(row.key);
    if (fill) {
      slices.push({ ...row, fill });
    } else {
      other ??= { key: OTHER_KEY, label: FALLBACK_CATEGORY, count: 0, share: 0, fill: OTHER_COLOR };
      other.count += row.count;
      other.share += row.share;
    }
  }
  return other ? [...slices, other] : slices;
}

function SliceTooltip({ active, payload }: { active?: boolean; payload?: { payload: Slice }[] }) {
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-sm shadow-md ring-1 ring-foreground/10">
      <p className="font-medium text-foreground">{s.label}</p>
      <p className="mt-0.5 text-muted-foreground tabular-nums">
        {s.count} application{s.count === 1 ? "" : "s"} · {formatPercent(s.share, 1)}
      </p>
    </div>
  );
}

export function RoleDonutChart({
  rows,
  categories,
  usedCategoryIds,
}: {
  rows: DistributionRow[];
  categories: Category[];
  usedCategoryIds: Set<string>;
}) {
  const slices = toSlices(rows, categories, usedCategoryIds);
  const total = slices.reduce((n, s) => n + s.count, 0);

  return (
    <figure className="flex flex-col items-center gap-6">
      <div className="relative size-56 shrink-0">
        {/* Rendered before the chart so the hover tooltip paints above the total. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
          <span className="text-3xl font-semibold tracking-tight tabular-nums">{total}</span>
          <span className="text-sm text-muted-foreground">applications</span>
        </div>
        <PieChart responsive style={{ width: "100%", height: "100%" }} accessibilityLayer>
          <Pie
            data={slices}
            dataKey="count"
            nameKey="label"
            innerRadius="62%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Tooltip content={<SliceTooltip />} wrapperStyle={{ zIndex: 10 }} allowEscapeViewBox={{ x: true, y: true }} isAnimationActive={false} />
        </PieChart>
      </div>

      {/* Legend doubles as the direct labels, so identity never rests on colour alone. */}
      <ul className="grid w-full min-w-0 gap-x-8 gap-y-2 text-[15px] sm:grid-cols-2">
        {slices.map((s) => (
          <li key={s.key} className="flex min-w-0 items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: s.fill }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.label}</span>
            <span className="tabular-nums">
              {s.count} <span className="text-muted-foreground">· {formatPercent(s.share)}</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
