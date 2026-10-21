import Link from "next/link";
import { CompassIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function NotFound() {
  return (
    <EmptyState icon={CompassIcon} title="Page not found" description="That page doesn't exist.">
      <Button asChild variant="outline">
        <Link href="/">Go to dashboard</Link>
      </Button>
    </EmptyState>
  );
}
