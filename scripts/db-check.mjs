// Verifies the PostgreSQL connection configured in .env.local.
// Prints server/database info and existing tables, never the password.
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

let target = "(unparseable DATABASE_URL)";
try {
  const u = new URL(url);
  target = `${decodeURIComponent(u.username)}@${u.hostname}:${u.port || 5432}/${u.pathname.slice(1)}`;
  if (!u.password) console.warn("! DATABASE_URL has no password.");
  if (u.password === "YOUR_PASSWORD") {
    console.error("✗ Replace YOUR_PASSWORD in .env.local with your real PostgreSQL password.");
    process.exit(1);
  }
} catch {
  console.error("✗ DATABASE_URL is not a valid URL. Special characters in the password must be URL-encoded.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
try {
  console.log(`Connecting to ${target} …`);
  await client.connect();
  const { rows: [info] } = await client.query("select current_database() as db, current_user as usr, version() as version");
  console.log(`✓ Connected to database "${info.db}" as "${info.usr}"`);
  console.log(`  ${info.version.split(",")[0]}`);
  const { rows: tables } = await client.query(
    "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
  );
  console.log(
    tables.length ? `  Tables in public schema: ${tables.map((t) => t.table_name).join(", ")}` : "  The public schema has no tables yet.",
  );
} catch (err) {
  const hints = {
    "28P01": "Password authentication failed — check the password in .env.local.",
    "3D000": "The database does not exist — check the database name.",
    ECONNREFUSED: "Nothing is listening at that host/port — is the PostgreSQL service running?",
    ENOTFOUND: "Host not found — check the host name.",
  };
  console.error(`✗ Connection failed: ${hints[err.code] ?? err.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
