"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HistoryIcon, Loader2Icon } from "lucide-react";
import { buildExportCsv, previewImport } from "@/lib/csv";
import type { Application, ApplicationEvent, Category, StageChange } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportDialog, type PendingImport } from "./backup-card";

// Earlier versions of this app stored data in the browser's IndexedDB under this name.
const LEGACY_DB = "job-tracker";
const STORES = ["applications", "categories", "stageHistory", "events"] as const;

async function legacyDatabaseExists(): Promise<boolean> {
  if (typeof indexedDB === "undefined" || !indexedDB.databases) return false;
  return (await indexedDB.databases()).some((d) => d.name === LEGACY_DB);
}

function readLegacyData(): Promise<{ applications: Application[]; categories: Category[]; stageHistory: StageChange[]; events: ApplicationEvent[] }> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(LEGACY_DB);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const idb = open.result;
      const present = STORES.filter((s) => idb.objectStoreNames.contains(s));
      if (present.length === 0) {
        idb.close();
        return resolve({ applications: [], categories: [], stageHistory: [], events: [] });
      }
      const tx = idb.transaction(present, "readonly");
      const result: Record<string, unknown[]> = { applications: [], categories: [], stageHistory: [], events: [] };
      for (const store of present) {
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => (result[store] = req.result);
      }
      tx.oncomplete = () => {
        idb.close();
        resolve(result as never);
      };
      tx.onerror = () => reject(tx.error);
    };
  });
}

/** One-time migration of records left in browser storage by the previous (IndexedDB) version. */
export function LegacyImportCard({ applications }: { applications: Application[] }) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingImport | null>(null);

  useEffect(() => {
    let cancelled = false;
    legacyDatabaseExists()
      .then(async (exists) => {
        if (!exists) return;
        const data = await readLegacyData();
        if (!cancelled && data.applications.length > 0) setAvailable(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!available) return null;

  async function start() {
    setBusy(true);
    try {
      const data = await readLegacyData();
      const text = buildExportCsv(data.applications, data.categories, data.stageHistory, data.events);
      setPending({ text, preview: previewImport(text, applications) });
    } catch {
      toast.error("Could not read the old browser storage.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="ring-amber-300/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HistoryIcon className="size-4" aria-hidden />
          Records found in browser storage
        </CardTitle>
        <CardDescription>
          This browser still has applications saved by the earlier version of the app (before PostgreSQL). Import them into the database —
          you&apos;ll see a preview first, and records already in PostgreSQL are detected as duplicates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => void start()} disabled={busy}>
          {busy && <Loader2Icon className="animate-spin" aria-hidden />}
          Review and import into PostgreSQL
        </Button>
      </CardContent>
      <ImportDialog key={pending ? "open" : "closed"} pending={pending} onClose={() => setPending(null)} />
    </Card>
  );
}
