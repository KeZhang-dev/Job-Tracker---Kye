"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { unwrap } from "@/lib/action-result";
import { deleteApplicationAction } from "@/lib/actions";
import type { Application } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function DeleteApplicationButton({
  application,
  redirectToList = false,
  iconOnly = false,
}: {
  application: Pick<Application, "id" | "companyName" | "jobTitle">;
  /** Navigate to the list afterwards (used on the detail page, which no longer exists after deleting). */
  redirectToList?: boolean;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await unwrap(deleteApplicationAction(application.id, redirectToList));
      toast.success(`Deleted ${application.jobTitle} at ${application.companyName}`);
      if (redirectToList) router.push("/applications");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the application.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {iconOnly ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${application.jobTitle} at ${application.companyName}`}>
            <Trash2Icon />
          </Button>
        ) : (
          <Button variant="destructive">
            <Trash2Icon aria-hidden />
            Delete
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this application?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="font-medium text-foreground">
              {application.jobTitle} at {application.companyName}
            </strong>{" "}
            and its status history, interview notes and job description will be permanently removed. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => void confirm()} disabled={busy}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
