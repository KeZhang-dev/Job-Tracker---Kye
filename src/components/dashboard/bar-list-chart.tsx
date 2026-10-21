"use client";

import { Bar, BarChart, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import { formatPercent } from "@/lib/metrics";

export interface BarListRow {
  key: string;
  label: string;
  count: number;
  /** 0–1 share of the total, shown next to the count when provided. */
  share?: number;
}

const ROW_HEIGHT = 34;

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: BarListRow }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs shadow-md ring-1 ring-foreground/10">
      <p className="font-medium text-foreground">{row.label}</p>
      <p className="mt-0.5 text-muted-foreground tabular-nums">
        {row.count} application{row.count === 1 ? "" : "s"}
        {row.share !== undefined && ` · ${formatPercent(row.share, 1)}`}
      </p>
    </div>
  );
}

/**
 * Horizontal bar list: one hue for every bar (the categories are nominal, so
 * colour carries no extra meaning), with direct count + percentage labels.
 */
export function BarListChart({
  rows,
  color = "var(--series-1)",
  maxValue,
  labelWidth = 150,
  caption,
}: {
  rows: BarListRow[];
  color?: string;
  /** Shared scale maximum, so sibling charts stay comparable. */
  maxValue?: number;
  labelWidth?: number;
  caption: string;
}) {
  const max = Math.max(maxValue ?? 0, ...rows.map((r) => r.count), 1);
  const label = (row: BarListRow) => (row.share !== undefined ? `${row.count} · ${formatPercent(row.share)}` : String(row.count));
  const data = rows.map((r) => ({ ...r, display: label(r) }));

  return (
    <figure>
      <BarChart
        responsive
        layout="vertical"
        data={data}
        style={{ width: "100%", height: rows.length * ROW_HEIGHT + 8 }}
        margin={{ top: 4, right: 72, bottom: 4, left: 0 }}
        barCategoryGap={8}
        accessibilityLayer
      >
        <XAxis type="number" hide domain={[0, max]} />
        <YAxis
          type="category"
          dataKey="label"
          width={labelWidth}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          interval={0}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} isAnimationActive={false} />
        <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} maxBarSize={18} minPointSize={1} isAnimationActive={false}>
          <LabelList
            dataKey="display"
            position="right"
            offset={8}
            className="tabular-nums"
            style={{ fontSize: 12, fill: "var(--foreground)" }}
          />
        </Bar>
      </BarChart>
      {/* Text alternative for screen readers. */}
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.label}</th>
              <td>{label(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
