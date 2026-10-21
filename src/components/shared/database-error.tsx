import { DatabaseZapIcon } from "lucide-react";
import { EmptyState } from "./empty-state";

/** Shown instead of a page when PostgreSQL can't be reached or isn't set up. */
export function DatabaseError({ message }: { message: string }) {
  return (
    <EmptyState
      icon={DatabaseZapIcon}
      title="Can't load data from PostgreSQL"
      description={
        <>
          {message}
          <span className="mt-3 block text-xs">
            Run <code className="rounded bg-muted px-1 py-0.5">npm run db:check</code> in the project folder to test the connection, then
            reload this page.
          </span>
        </>
      }
    />
  );
}
