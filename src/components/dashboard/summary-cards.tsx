import { AwardIcon, FileTextIcon, HourglassIcon, UsersIcon, XCircleIcon, type LucideIcon } from "lucide-react";
import type { Summary } from "@/lib/metrics";
import { Card } from "@/components/ui/card";

function StatTile({ label, value, detail, icon: Icon }: { label: string; value: number; detail: string; icon: LucideIcon }) {
  return (
    <Card size="sm" className="gap-1 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </Card>
  );
}

export function SummaryCards({ summary }: { summary: Summary }) {
  const closed = summary.total - summary.active;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <StatTile icon={FileTextIcon} label="Total applications" value={summary.total} detail={`${closed} closed`} />
      <StatTile icon={HourglassIcon} label="In progress" value={summary.active} detail="No final outcome yet" />
      <StatTile
        icon={UsersIcon}
        label="Reached interview"
        value={summary.interviewed}
        detail={`${summary.currentlyInterviewing} interviewing now · ${summary.interviewRounds} round${summary.interviewRounds === 1 ? "" : "s"} logged`}
      />
      <StatTile icon={AwardIcon} label="Offers" value={summary.offers} detail="Applications that reached Offer" />
      <StatTile icon={XCircleIcon} label="Rejections" value={summary.rejections} detail="Currently rejected" />
    </div>
  );
}
