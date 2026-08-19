import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CompassIcon } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 py-24">
      <CompassIcon className="h-10 w-10 text-ink-faint" aria-hidden="true" />
      <h1 className="font-display text-2xl font-semibold text-foreground">Page not found</h1>
      <p className="text-muted-foreground max-w-sm">
        That route doesn't exist in ProcureX. Head back to the overview dashboard.
      </p>
      <Button asChild>
        <Link to="/">Back to overview</Link>
      </Button>
    </div>
  );
}
