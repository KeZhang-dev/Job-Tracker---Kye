import "server-only";

import { DatabaseNotConfiguredError } from ".";
import { UserFacingError } from "@/lib/repository";

/** Finds the PostgreSQL / Node error code, which drizzle may wrap in `cause`. */
function errorCode(err: unknown): string | undefined {
  let current: unknown = err;
  for (let depth = 0; current && depth < 5; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

const MESSAGES: Record<string, string> = {
  ECONNREFUSED: "Can't reach PostgreSQL. Make sure the PostgreSQL service is running and the host/port in .env.local are correct.",
  ENOTFOUND: "The PostgreSQL host in .env.local could not be found.",
  ETIMEDOUT: "Connecting to PostgreSQL timed out.",
  "28P01": "PostgreSQL rejected the username or password in .env.local.",
  "28000": "PostgreSQL refused the connection for this user. Check pg_hba.conf and the username in .env.local.",
  "3D000": "The database named in .env.local does not exist.",
  "42P01": "The database tables don't exist yet. Run `npm run db:migrate`, then reload.",
  "23505": "That already exists.",
  "23503": "A related record no longer exists. Reload the page and try again.",
  "23514": "One of the values isn't allowed.",
  "22P02": "One of the values has an invalid format.",
};

/** Turns any error into a message that is safe to show in the UI (no credentials). */
export function describeError(err: unknown): string {
  if (err instanceof UserFacingError || err instanceof DatabaseNotConfiguredError) return err.message;
  const code = errorCode(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  console.error("Unexpected database error:", err);
  return "Unexpected database error. Check the terminal running the app for details.";
}

/** Runs a page's data loading, returning a friendly error instead of throwing. */
export async function loadPageData<T>(load: () => Promise<T>): Promise<{ data: T; error?: undefined } | { data?: undefined; error: string }> {
  try {
    return { data: await load() };
  } catch (err) {
    return { error: describeError(err) };
  }
}
