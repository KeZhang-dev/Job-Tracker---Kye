"use client";

import { AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const databaseProblem = /postgres|database|ECONNREFUSED/i.test(`${error.name} ${error.message}`);
  return (
    <EmptyState
      icon={AlertTriangleIcon}
      title={databaseProblem ? "Database unavailable" : "Something went wrong"}
      description={
        databaseProblem
          ? "PostgreSQL could not be reached. Check that the service is running and DATABASE_URL in .env.local is correct, then try again."
          : "An unexpected error occurred. Details are in the terminal running the app."
      }
    >
      <Button variant="outline" onClick={() => retry()}>
        Try again
      </Button>
    </EmptyState>
  );
}
