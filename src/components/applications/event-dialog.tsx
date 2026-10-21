"use client";

import { useState } from "react";
import { toast } from "sonner";
import { EVENT_TYPES, EVENT_TYPE_LABELS, type EventType } from "@/lib/constants";
import { isValidDateOnly, todayDateOnly } from "@/lib/dates";
import { unwrap } from "@/lib/action-result";
import { saveEventAction } from "@/lib/actions";
import type { ApplicationEvent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, SelectInput, optionsFrom } from "@/components/shared/form-field";

function EventForm({
  applicationId,
  event,
  onDone,
}: {
  applicationId: string;
  event?: ApplicationEvent;
  onDone: () => void;
}) {
  const [type, setType] = useState<EventType>(event?.type ?? "interview");
  const [date, setDate] = useState(event?.date ?? todayDateOnly());
  const [title, setTitle] = useState(event?.title ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidDateOnly(date)) return setError("Enter a valid date.");
    setSaving(true);
    try {
      await unwrap(saveEventAction({ id: event?.id, applicationId, type, date, title: title.trim(), notes: notes.trim() }));
      toast.success(event ? "Event updated" : "Event added");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the event.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{event ? "Edit event" : "Log interview or assessment"}</DialogTitle>
        <DialogDescription>
          Each logged interview counts as one round. Upcoming events can be logged too.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="event-type" label="Type" required>
          <SelectInput id="event-type" value={type} onChange={setType} options={optionsFrom(EVENT_TYPES, EVENT_TYPE_LABELS)} />
        </FormField>
        <FormField id="event-date" label="Date" required error={error}>
          <Input
            id="event-date"
            type="date"
            value={date}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              setDate(e.target.value);
              setError(undefined);
            }}
          />
        </FormField>
      </div>
      <FormField id="event-title" label="Title" hint="e.g. Panel interview with engineering manager">
        <Input id="event-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
      </FormField>
      <FormField id="event-notes" label="Notes" hint="Questions asked, how it went, follow-ups.">
        <Textarea id="event-notes" rows={6} value={notes} maxLength={20000} onChange={(e) => setNotes(e.target.value)} />
      </FormField>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {event ? "Save changes" : "Add event"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EventDialog({
  applicationId,
  event,
  open,
  onOpenChange,
}: {
  applicationId: string;
  event?: ApplicationEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <EventForm applicationId={applicationId} event={event} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
