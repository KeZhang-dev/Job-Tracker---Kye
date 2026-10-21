import { STAGE_LABELS, type Stage } from "@/lib/constants";
import { cn } from "@/lib/utils";

// One consistent colour per stage group. The dot + text label means colour is
// never the only cue.
const STAGE_STYLES: Record<Stage, string> = {
  applied: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-400/15 dark:text-slate-200 dark:ring-slate-400/30",
  phone_screen: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-400/15 dark:text-sky-200 dark:ring-sky-400/30",
  online_assessment: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-400/15 dark:text-sky-200 dark:ring-sky-400/30",
  first_interview: "bg-indigo-50 text-indigo-800 ring-indigo-200 dark:bg-indigo-400/15 dark:text-indigo-200 dark:ring-indigo-400/30",
  second_interview: "bg-indigo-50 text-indigo-800 ring-indigo-200 dark:bg-indigo-400/15 dark:text-indigo-200 dark:ring-indigo-400/30",
  technical_interview: "bg-indigo-50 text-indigo-800 ring-indigo-200 dark:bg-indigo-400/15 dark:text-indigo-200 dark:ring-indigo-400/30",
  reference_check: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-400/15 dark:text-amber-200 dark:ring-amber-400/30",
  offer: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-200 dark:ring-emerald-400/30",
  rejected: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-400/15 dark:text-red-200 dark:ring-red-400/30",
  withdrawn: "bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-400/15 dark:text-zinc-300 dark:ring-zinc-400/30",
  no_response: "bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-400/15 dark:text-zinc-300 dark:ring-zinc-400/30",
  position_closed: "bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-400/15 dark:text-zinc-300 dark:ring-zinc-400/30",
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
