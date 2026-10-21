import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

export function ApplicationNotFound() {
  return (
    <EmptyState icon={SearchXIcon} title="Application not found" description="It may have been deleted, or the link is out of date.">
      <Button asChild variant="outline">
        <Link href="/applications">Back to applications</Link>
      </Button>
    </EmptyState>
  );
}
