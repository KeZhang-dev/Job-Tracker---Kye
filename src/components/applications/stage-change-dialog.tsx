"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeftIcon } from "lucide-react";
import { ACTIVE_STAGES, STAGE_LABELS, TERMINAL_STAGES, type Stage } from "@/lib/constants";
import { toDateTimeLocal } from "@/lib/dates";
import { unwrap } from "@/lib/action-result";
import { changeStageAction } from "@/lib/actions";
import type { Application } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { StageBadge } from "@/components/shared/stage-badge";

function StageChangeForm({ application, onDone }: { application: Application; onDone: () => void }) {
  const [stage, setStage] = useState<Stage | "">("");
  // The picker only has minute precision; if left at its default, record the exact current time instead.
  const [defaultChangedAt] = useState(() => toDateTimeLocal(new Date().toISOString()));
  const [changedAt, setChangedAt] = useState(defaultChangedAt);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stage) return setError("Choose the new stage.");
    const date = new Date(changedAt);
    if (!changedAt || Number.isNaN(date.getTime())) return setError("Enter a valid date and time.");
    if (date.getTime() > Date.now() + 60_000) return setError("The change can't be in the future.");
    setSaving(true);
    try {
      // null = "now" on the server (exact time, not the picker's whole minute).
      const at = changedAt === defaultChangedAt ? null : date.toISOString();
      await unwrap(changeStageAction(application.id, stage, at, note));
      toast.success(`Moved to ${STAGE_LABELS[stage]}`);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the stage.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>Update stage</DialogTitle>
        <DialogDescription className="flex flex-wrap items-center gap-1.5">
          Currently <StageBadge stage={application.stage} />. Any stage can be chosen — steps can be skipped.
        </DialogDescription>
      </DialogHeader>
      <FormField id="stage-new" label="New stage" required error={error && !stage ? error : undefined}>
        <Select value={stage} onValueChange={(v) => { setStage(v as Stage); setError(undefined); }}>
          <SelectTrigger id="stage-new" className="w-full" aria-invalid={error && !stage ? true : undefined}>
            <SelectValue placeholder="Choose a stage" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectGroup>
              <SelectLabel>Active stages</SelectLabel>
              {ACTIVE_STAGES.map((s) => (
                <SelectItem key={s} value={s} disabled={s === application.stage}>
                  {STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Outcomes</SelectLabel>
              {TERMINAL_STAGES.map((s) => (
                <SelectItem key={s} value={s} disabled={s === application.stage}>
                  {STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FormField>
      <FormField id="stage-date" label="When did this happen?" error={error && stage ? error : undefined}>
        <Input id="stage-date" type="datetime-local" value={changedAt} onChange={(e) => setChangedAt(e.target.value)} />
      </FormField>
      <FormField id="stage-note" label="Note" hint="Optional — e.g. who you spoke to or what was discussed.">
        <Textarea id="stage-note" rows={3} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
      </FormField>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          Save stage
        </Button>
      </DialogFooter>
    </form>
  );
}

export function StageChangeDialog({ application }: { application: Application }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowRightLeftIcon aria-hidden />
          Update stage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <StageChangeForm application={application} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
