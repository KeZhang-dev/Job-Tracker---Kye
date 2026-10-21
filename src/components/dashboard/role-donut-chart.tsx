"use client";

import { Pie, PieChart, Tooltip } from "recharts";
import { FALLBACK_CATEGORY } from "@/lib/constants";
import { formatPercent, type DistributionRow } from "@/lib/metrics";
import type { Category } from "@/lib/types";

/** Fixed categorical order (validated palette); a 9th hue is never generated. */
const CATEGORY_COLORS = ["--cat-1", "--cat-2", "--cat-3", "--cat-4", "--cat-5", "--cat-6", "--cat-7", "--cat-8"].map(
  (v) => `var(${v})`,
);
const OTHER_COLOR = "var(--series-muted)";
const OTHER_KEY = "__other";

interface Slice extends DistributionRow {
  fill: string;
}

/**
 * Colour follows the category (its position in the category list), never its
 * rank, so a date filter doesn't repaint slices. "Other", uncategorised rows and
 * any categories beyond the eighth fold into one gray "Other" slice.
 */
function toSlices(rows: DistributionRow[], categories: Category[]): Slice[] {
  const colorById = new Map(
    categories
      .filter((c) => c.name.toLowerCase() !== FALLBACK_CATEGORY.toLowerCase())
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
    <div className="rounded-lg bg-popover px-3 py-2 text-xs shadow-md ring-1 ring-foreground/10">
      <p className="font-medium text-foreground">{s.label}</p>
      <p className="mt-0.5 text-muted-foreground tabular-nums">
        {s.count} application{s.count === 1 ? "" : "s"} · {formatPercent(s.share, 1)}
      </p>
    </div>
  );
}

export function RoleDonutChart({ rows, categories }: { rows: DistributionRow[]; categories: Category[] }) {
  const slices = toSlices(rows, categories);
  const total = slices.reduce((n, s) => n + s.count, 0);

  return (
    <figure className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative size-52 shrink-0">
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
          <Tooltip content={<SliceTooltip />} isAnimationActive={false} />
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
          <span className="text-2xl font-semibold tracking-tight tabular-nums">{total}</span>
          <span className="text-xs text-muted-foreground">applications</span>
        </div>
      </div>

      {/* Legend doubles as the direct labels, so identity never rests on colour alone. */}
      <ul className="w-full min-w-0 space-y-1.5 text-sm">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
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
