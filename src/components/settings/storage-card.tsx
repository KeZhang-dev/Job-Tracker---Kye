"use client";

import { useSyncExternalStore } from "react";
import { DatabaseIcon, ShieldAlertIcon, ShieldCheckIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Whether the browser has granted persistent storage (protects against automatic eviction).
let persisted: boolean | null = null;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (persisted === null) {
    navigator.storage?.persisted?.()
      .then((value) => {
        persisted = value;
        listeners.forEach((l) => l());
      })
      .catch(() => {});
  }
  return () => listeners.delete(listener);
}

export function StorageCard() {
  const isPersisted = useSyncExternalStore(subscribe, () => persisted, () => null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DatabaseIcon className="size-4" aria-hidden />
          Where your data lives
        </CardTitle>
        <CardDescription>
          Everything is stored locally in this browser&apos;s IndexedDB. Nothing is uploaded, and the app works offline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-amber-900">
          <p className="font-medium">Your data can be lost if browser storage is cleared.</p>
          <p className="mt-1 text-amber-900/80">
            Clearing site data or cookies, using a private window, uninstalling the browser, or opening the app in a different browser or on a
            different port (e.g. localhost:3001 instead of :3000) will not show your records. Export a CSV backup regularly.
          </p>
        </div>
        {isPersisted !== null && (
          <p className="flex items-center gap-2 text-muted-foreground">
            {isPersisted ? (
              <ShieldCheckIcon className="size-4 text-emerald-600" aria-hidden />
            ) : (
              <ShieldAlertIcon className="size-4 text-amber-600" aria-hidden />
            )}
            {isPersisted
              ? "Persistent storage is granted — the browser won't evict this data automatically."
              : "Persistent storage was not granted, so the browser may clear data under storage pressure. Keep backups."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
