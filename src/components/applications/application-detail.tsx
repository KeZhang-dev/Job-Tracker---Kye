"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeftIcon, ArrowRightIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { EMPLOYMENT_TYPE_LABELS, EVENT_TYPE_LABELS, SOURCE_LABELS, WORK_MODE_LABELS } from "@/lib/constants";
import { formatDate, formatTimestamp } from "@/lib/dates";
import { unwrap } from "@/lib/action-result";
import { deleteEventAction, deleteStageChangeAction } from "@/lib/actions";
import type { Application, ApplicationEvent, Category, StageChange } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LongText } from "@/components/shared/long-text";
import { StageBadge } from "@/components/shared/stage-badge";
import { DeleteApplicationButton } from "./delete-application-button";
import { EventDialog } from "./event-dialog";
import { StageChangeDialog } from "./stage-change-dialog";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm not-last:border-b">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium break-words">{children}</dd>
    </div>
  );
}

function StatusHistory({ history }: { history: StageChange[] }) {
  const ordered = [...history].sort((a, b) => b.changedAt.localeCompare(a.changedAt));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Status history</CardTitle>
        <CardDescription>Every stage change, newest first.</CardDescription>
      </CardHeader>
      <CardContent>
        {ordered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stage changes recorded.</p>
        ) : (
          <ol className="relative space-y-4 border-l pl-5">
            {ordered.map((change) => (
              <li key={change.id} className="group relative">
                <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-card bg-foreground/40" aria-hidden />
                <div className="flex flex-wrap items-center gap-1.5">
                  {change.fromStage ? (
                    <>
                      <StageBadge stage={change.fromStage} />
                      <ArrowRightIcon className="size-3.5 text-muted-foreground" aria-label="to" />
                    </>
                  ) : null}
                  <StageBadge stage={change.toStage} />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="ml-auto opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label="Remove this history entry"
                    title="Remove this history entry (does not change the current stage)"
                    onClick={async () => {
                      try {
                        await unwrap(deleteStageChangeAction(change.id));
                        toast.success("History entry removed");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Could not remove the entry.");
                      }
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatTimestamp(change.changedAt)}</p>
                {change.note && <p className="mt-1 text-sm whitespace-pre-wrap">{change.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function EventsCard({ applicationId, events }: { applicationId: string; events: ApplicationEvent[] }) {
  const [dialog, setDialog] = useState<{ open: boolean; event?: ApplicationEvent }>({ open: false });
  const ordered = [...events].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interviews & assessments</CardTitle>
        <CardDescription>Log each round with your notes.</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={() => setDialog({ open: true })}>
            <PlusIcon aria-hidden />
            Log event
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {ordered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No interviews or assessments logged yet.</p>
        ) : (
          <ul className="divide-y">
            {ordered.map((event) => (
              <li key={event.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{EVENT_TYPE_LABELS[event.type]}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(event.date)}</span>
                    </div>
                    {event.title && <p className="mt-1 text-sm font-medium">{event.title}</p>}
                    {event.notes && <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{event.notes}</p>}
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label="Edit event" onClick={() => setDialog({ open: true, event })}>
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete event"
                    onClick={async () => {
                      try {
                        await unwrap(deleteEventAction(event.id));
                        toast.success("Event deleted");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Could not delete the event.");
                      }
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <EventDialog
        applicationId={applicationId}
        event={dialog.event}
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </Card>
  );
}

export function ApplicationDetail({
  application: app,
  category,
  history,
  events,
}: {
  application: Application;
  category?: Category;
  history: StageChange[];
  events: ApplicationEvent[];
}) {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/applications">
          <ArrowLeftIcon aria-hidden />
          All applications
        </Link>
      </Button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StageBadge stage={app.stage} />
            {app.isSample && <Badge variant="outline">Sample data</Badge>}
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight break-words">{app.jobTitle}</h1>
          <p className="text-muted-foreground">
            {app.companyName}
            {app.location && ` · ${app.location}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StageChangeDialog application={app} />
          <Button asChild variant="outline">
            <Link href={`/applications/${app.id}/edit`}>
              <PencilIcon aria-hidden />
              Edit
            </Link>
          </Button>
          <DeleteApplicationButton application={app} redirectToList />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Job description</CardTitle>
            </CardHeader>
            <CardContent>
              <LongText text={app.jobDescription} emptyLabel="No job description saved." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Personal notes</CardTitle>
            </CardHeader>
            <CardContent>
              <LongText text={app.notes} emptyLabel="No notes yet." collapsedLines={20} />
            </CardContent>
          </Card>
          <EventsCard applicationId={app.id} events={events} />
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <DetailRow label="Role category">{category?.name ?? "—"}</DetailRow>
                <DetailRow label="Work mode">{WORK_MODE_LABELS[app.workMode]}</DetailRow>
                <DetailRow label="Employment type">{EMPLOYMENT_TYPE_LABELS[app.employmentType]}</DetailRow>
                <DetailRow label="Source">{SOURCE_LABELS[app.source]}</DetailRow>
                <DetailRow label="Applied">{formatDate(app.applicationDate)}</DetailRow>
                <DetailRow label="Closing date">{formatDate(app.closingDate)}</DetailRow>
                <DetailRow label="Next follow-up">{formatDate(app.followUpDate)}</DetailRow>
                <DetailRow label="Last updated">{formatTimestamp(app.updatedAt)}</DetailRow>
                <DetailRow label="Created">{formatTimestamp(app.createdAt)}</DetailRow>
              </dl>
            </CardContent>
          </Card>
          <StatusHistory history={history} />
        </div>
      </div>
    </div>
  );
}
