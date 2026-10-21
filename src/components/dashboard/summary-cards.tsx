import type { Summary } from "@/lib/metrics";
import { Card } from "@/components/ui/card";

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card className="gap-2 px-5 py-5">
      <p className="text-lg font-medium text-muted-foreground">{label}</p>
      <p className="text-5xl font-semibold tracking-tight tabular-nums">{value}</p>
    </Card>
  );
}

export function SummaryCards({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <StatTile label="Total applications" value={summary.total} />
      <StatTile label="In progress" value={summary.active} />
      <StatTile label="Reached interview" value={summary.interviewed} />
      <StatTile label="Offers" value={summary.offers} />
      <StatTile label="Rejections" value={summary.rejections} />
    </div>
  );
}
