import "server-only";

import { DatabaseIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Connection target without credentials, e.g. "postgres@localhost:5432/job_tracker". */
function describeTarget(): string | null {
  const raw = process.env.DATABASE_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return `${decodeURIComponent(url.username)}@${url.hostname}:${url.port || "5432"}/${url.pathname.slice(1)}`;
  } catch {
    return null;
  }
}

export function DatabaseCard() {
  const target = describeTarget();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DatabaseIcon className="size-4" aria-hidden />
          Where your data lives
        </CardTitle>
        <CardDescription>
          Applications are stored in your local PostgreSQL database. The connection is configured in <code>.env.local</code> and only used
          on the server; the password never reaches the browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          <span className="text-muted-foreground">Connected to </span>
          <code className="rounded bg-muted px-1.5 py-0.5">{target ?? "(DATABASE_URL not set)"}</code>
        </p>
        <p className="text-muted-foreground">
          Back up regularly with <strong className="font-medium text-foreground">Export CSV</strong> below, or with PostgreSQL&apos;s own
          tools, e.g. <code className="rounded bg-muted px-1 py-0.5">pg_dump -U postgres -d job_tracker -f job_tracker.sql</code>.
        </p>
      </CardContent>
    </Card>
  );
}
