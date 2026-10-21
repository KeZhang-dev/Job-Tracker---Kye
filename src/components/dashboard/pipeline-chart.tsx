import { ACTIVE_STAGES, STAGE_LABELS, TERMINAL_STAGES, type Stage } from "@/lib/constants";
import { BarListChart } from "./bar-list-chart";
import { ChartCard } from "./chart-card";

export function PipelineChart({ counts }: { counts: Record<Stage, number> }) {
  const toRows = (stages: readonly Stage[]) => stages.map((s) => ({ key: s, label: STAGE_LABELS[s], count: counts[s] }));
  const active = toRows(ACTIVE_STAGES);
  const terminal = toRows(TERMINAL_STAGES);
  const max = Math.max(...active.map((r) => r.count), ...terminal.map((r) => r.count));
  const sum = (rows: { count: number }[]) => rows.reduce((n, r) => n + r.count, 0);

  return (
    <ChartCard title="Application pipeline" description="Where each application is right now (current stage only).">
      <div className="grid gap-6 md:grid-cols-2">
        <section aria-label="Active stages">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <span className="size-2.5 rounded-sm bg-series-1" aria-hidden />
            Active stages
            <span className="font-normal text-muted-foreground tabular-nums">({sum(active)})</span>
          </h3>
          <BarListChart rows={active} maxValue={max} labelWidth={150} caption="Applications by active stage" />
        </section>
        <section aria-label="Final outcomes">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <span className="size-2.5 rounded-sm bg-series-muted" aria-hidden />
            Final outcomes
            <span className="font-normal text-muted-foreground tabular-nums">({sum(terminal)})</span>
          </h3>
          <BarListChart rows={terminal} maxValue={max} color="var(--series-muted)" labelWidth={150} caption="Applications by final outcome" />
        </section>
      </div>
    </ChartCard>
  );
}
