import { STAGE_LABELS, type Stage } from "@/lib/constants";
import { cn } from "@/lib/utils";

// One consistent colour per stage group. The dot + text label means colour is
// never the only cue.
const STAGE_STYLES: Record<Stage, string> = {
  applied: "bg-slate-100 text-slate-700 ring-slate-200",
  phone_screen: "bg-sky-50 text-sky-800 ring-sky-200",
  online_assessment: "bg-sky-50 text-sky-800 ring-sky-200",
  first_interview: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  second_interview: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  technical_interview: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  reference_check: "bg-amber-50 text-amber-800 ring-amber-200",
  offer: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
  withdrawn: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  no_response: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  position_closed: "bg-zinc-100 text-zinc-600 ring-zinc-200",
};

export function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        STAGE_STYLES[stage],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {STAGE_LABELS[stage]}
    </span>
  );
}
