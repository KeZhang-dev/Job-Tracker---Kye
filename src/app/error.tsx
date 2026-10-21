"use client";

import { AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const storageProblem = /indexeddb|database|dexie|quota/i.test(`${error.name} ${error.message}`);
  return (
    <EmptyState
      icon={AlertTriangleIcon}
      title={storageProblem ? "Local storage is unavailable" : "Something went wrong"}
      description={
        storageProblem
          ? "The browser's database (IndexedDB) could not be opened. Private/incognito windows or strict privacy settings can block it. Try a normal browser window."
          : error.message || "An unexpected error occurred."
      }
    >
      <Button variant="outline" onClick={() => retry()}>
        Try again
      </Button>
    </EmptyState>
  );
}
