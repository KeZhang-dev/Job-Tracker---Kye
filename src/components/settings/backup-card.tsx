"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangleIcon, DownloadIcon, Loader2Icon, UploadIcon } from "lucide-react";
import { importCsvAction } from "@/lib/actions";
import { downloadBlob, readImportFile, type DuplicateMode, type ImportPreview } from "@/lib/csv";
import { todayDateOnly } from "@/lib/dates";
import type { Application } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" | "error" }) {
  return (
    <div className="rounded-lg border p-3">
      <p className={tone === "error" ? "text-xs text-destructive" : tone === "warn" ? "text-xs text-amber-700" : "text-xs text-muted-foreground"}>{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export interface PendingImport {
  text: string;
  preview: ImportPreview;
}

export function ImportDialog({ pending, onClose }: { pending: PendingImport | null; onClose: () => void }) {
  const [mode, setMode] = useState<DuplicateMode>("skip");
  const [importing, setImporting] = useState(false);
  if (!pending) return null;
  const { preview } = pending;

  const count = (s: string) => preview.rows.filter((r) => r.status === s).length;
  const fresh = count("new");
  const duplicates = count("duplicate");
  const invalid = count("invalid");
  const toImport = fresh + (mode === "overwrite" ? duplicates : 0);
  const issues = preview.rows.filter((r) => r.errors.length > 0 || r.warnings.length > 0);

  async function confirm() {
    setImporting(true);
    try {
      // The server re-checks the file against the current database before writing.
      const result = await importCsvAction(pending!.text, mode);
      if (!result.ok) {
        toast.error(`Import failed. No changes were saved. ${result.error}`);
        setImporting(false);
        return;
      }
      const { added, updated } = result.data;
      toast.success(`Import complete: ${added} added${updated ? `, ${updated} updated` : ""}.`);
      onClose();
    } catch {
      toast.error("Import failed: could not reach the server. No changes were saved.");
      setImporting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !importing && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review import</DialogTitle>
          <DialogDescription>Nothing has been saved yet. Check the summary, then confirm.</DialogDescription>
        </DialogHeader>

        {preview.fileErrors.length > 0 && (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {preview.fileErrors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}

        {preview.rows.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="New" value={fresh} />
              <Stat label="Duplicates" value={duplicates} tone={duplicates ? "warn" : undefined} />
              <Stat label="Invalid (skipped)" value={invalid} tone={invalid ? "error" : undefined} />
            </div>

            {duplicates > 0 && (
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium">
                  Duplicates match an existing record by ID, or by company + job title + application date.
                </legend>
                {(
                  [
                    ["skip", "Skip duplicates", "Keep the records already in the tracker."],
                    ["overwrite", "Replace existing records", "Overwrite them (including history) with the rows from this file."],
                  ] as const
                ).map(([value, title, hint]) => (
                  <Label key={value} className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 font-normal has-checked:border-foreground/40 has-checked:bg-muted/50">
                    <input type="radio" name="dup-mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="mt-0.5" />
                    <span>
                      <span className="block font-medium">{title}</span>
                      <span className="text-xs text-muted-foreground">{hint}</span>
                    </span>
                  </Label>
                ))}
              </fieldset>
            )}

            {issues.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Row notes ({issues.length})</p>
                <ScrollArea className="h-48 rounded-lg border">
                  <ul className="divide-y text-xs">
                    {issues.map((r) => (
                      <li key={r.rowNumber} className="p-2.5">
                        <p className="font-medium">
                          Row {r.rowNumber}: {r.jobTitle || "(no title)"} — {r.companyName || "(no company)"}
                        </p>
                        {r.errors.map((e, i) => (
                          <p key={`e${i}`} className="text-destructive">✕ {e}</p>
                        ))}
                        {r.warnings.map((w, i) => (
                          <p key={`w${i}`} className="text-amber-700">! {w}</p>
                        ))}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={() => void confirm()} disabled={importing || toImport === 0}>
            {importing && <Loader2Icon className="animate-spin" aria-hidden />}
            Import {toImport} record{toImport === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BackupCard({ applications }: { applications: Application[] }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [busy, setBusy] = useState<"export" | "read" | null>(null);

  async function exportCsv() {
    setBusy("export");
    try {
      const response = await fetch("/api/export", { cache: "no-store" });
      if (!response.ok) throw new Error(await response.text());
      const count = Number(response.headers.get("X-Record-Count") ?? 0);
      downloadBlob(await response.blob(), `job-applications-${todayDateOnly()}.csv`);
      toast.success(`Exported ${count} application${count === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err instanceof Error && err.message ? `Export failed: ${err.message}` : "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      toast.error("Please choose a .csv file.");
      return;
    }
    setBusy("read");
    try {
      setPending(await readImportFile(file, applications));
    } catch {
      toast.error("The file could not be read as CSV.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & restore</CardTitle>
        <CardDescription>
          Export everything (including job descriptions, status history and interview notes) to a single CSV file. Import a CSV to restore a
          backup or bring in records from a spreadsheet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void exportCsv()} disabled={busy !== null || applications.length === 0}>
            {busy === "export" ? <Loader2Icon className="animate-spin" aria-hidden /> : <DownloadIcon aria-hidden />}
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={busy !== null}>
            {busy === "read" ? <Loader2Icon className="animate-spin" aria-hidden /> : <UploadIcon aria-hidden />}
            Import CSV
          </Button>
          <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void handleFile(e)} aria-label="Choose CSV file to import" />
        </div>
        <p className="flex gap-2 text-xs text-muted-foreground">
          <AlertTriangleIcon className="size-4 shrink-0 text-amber-600" aria-hidden />
          Imports need at least “Company Name” and “Job Title” columns. Unknown stages, sources or dates are flagged before anything is saved.
        </p>
      </CardContent>
      <ImportDialog key={pending ? "open" : "closed"} pending={pending} onClose={() => setPending(null)} />
    </Card>
  );
}
