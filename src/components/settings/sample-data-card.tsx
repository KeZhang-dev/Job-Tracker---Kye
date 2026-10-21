"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FlaskConicalIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { unwrap, type ActionResult } from "@/lib/action-result";
import { loadSampleDataAction, removeSampleDataAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SampleDataCard({ sampleCount }: { sampleCount: number }) {
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<ActionResult<number>>, message: (n: number) => string) {
    setBusy(true);
    try {
      toast.success(message(await unwrap(action())));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sample data</CardTitle>
        <CardDescription>
          Load 10 clearly labelled demo applications (company names start with “Sample Co”) to explore the dashboard. They are tagged as
          samples and can be removed at any time without touching your real records.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        {sampleCount > 0 ? (
          <>
            <Button variant="destructive" disabled={busy} onClick={() => void run(removeSampleDataAction, (n) => `Removed ${n} sample records`)}>
              {busy ? <Loader2Icon className="animate-spin" aria-hidden /> : <Trash2Icon aria-hidden />}
              Remove sample data
            </Button>
            <span className="text-sm text-muted-foreground">{sampleCount} sample records loaded.</span>
          </>
        ) : (
          <Button variant="outline" disabled={busy} onClick={() => void run(loadSampleDataAction, (n) => `Loaded ${n} sample records`)}>
            {busy ? <Loader2Icon className="animate-spin" aria-hidden /> : <FlaskConicalIcon aria-hidden />}
            Load sample data
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
