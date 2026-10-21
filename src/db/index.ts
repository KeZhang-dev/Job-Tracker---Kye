import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;
/** A database handle or an open transaction — repository functions accept either. */
export type Executor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not set. Add it to .env.local and restart the server.");
    this.name = "DatabaseNotConfiguredError";
  }
}

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { jobTrackerPool?: Pool; jobTrackerDb?: Database };

export function getDb(): Database {
  if (globalForDb.jobTrackerDb) return globalForDb.jobTrackerDb;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new DatabaseNotConfiguredError();
  const pool = new Pool({ connectionString, max: 5, connectionTimeoutMillis: 5000 });
  // Without a listener, an idle-client error (e.g. the server restarting) would crash the process.
  pool.on("error", (err) => console.error("PostgreSQL pool error:", err.message));
  globalForDb.jobTrackerPool = pool;
  globalForDb.jobTrackerDb = drizzle(pool, { schema });
  return globalForDb.jobTrackerDb;
}
