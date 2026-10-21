"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendGranularity, TrendPoint } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { ChartCard, ChartEmpty } from "./chart-card";

function TrendTooltip({ active, payload }: { active?: boolean; payload?: { payload: TrendPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs shadow-md ring-1 ring-foreground/10">
      <p className="font-medium text-foreground">{p.fullLabel}</p>
      <p className="mt-0.5 text-muted-foreground tabular-nums">
        {p.count} application{p.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function TrendChart({
  points,
  undated,
  granularity,
  onGranularityChange,
}: {
  points: TrendPoint[];
  undated: number;
  granularity: TrendGranularity;
  onGranularityChange: (g: TrendGranularity) => void;
}) {
  const toggle = (
    <div role="group" aria-label="Group by" className="inline-flex rounded-lg bg-muted p-0.5">
      {(["week", "month"] as const).map((g) => (
        <button
          key={g}
          type="button"
          aria-pressed={granularity === g}
          onClick={() => onGranularityChange(g)}
          className={cn(
            "rounded-md px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            granularity === g && "bg-card text-foreground shadow-sm",
          )}
        >
          {g === "week" ? "Weekly" : "Monthly"}
        </button>
      ))}
    </div>
  );

  const total = points.reduce((n, p) => n + p.count, 0);
  const average = points.length ? total / points.length : 0;

  return (
    <ChartCard
      title="Application trend"
      description={
        points.length
          ? `${average.toFixed(1)} applications per ${granularity} on average${undated ? ` · ${undated} without a valid date not shown` : ""}`
          : "Applications submitted over time."
      }
      action={toggle}
    >
      {points.length === 0 ? (
        <ChartEmpty message="No dated applications in this period." />
      ) : (
        <figure>
          <BarChart
            responsive
            data={points}
            style={{ width: "100%", height: 240 }}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--chart-grid)" }}
              tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
              minTickGap={12}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--chart-axis)" }} width={40} />
            <Tooltip content={<TrendTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} isAnimationActive={false} />
            <Bar dataKey="count" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
          </BarChart>
          <table className="sr-only">
            <caption>Applications per {granularity}</caption>
            <tbody>
              {points.map((p) => (
                <tr key={p.key}>
                  <th scope="row">{p.fullLabel}</th>
                  <td>{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      )}
    </ChartCard>
  );
}
