import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CompassIcon } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 py-24">
      <CompassIcon className="h-10 w-10 text-text-dim" aria-hidden="true" />
      <h1 className="font-display text-2xl font-semibold text-text-hi">Page not found</h1>
      <p className="text-text-mid max-w-sm">
        That route doesn't exist in ProcureX. Head back to the overview dashboard.
      </p>
      <Button asChild className="bg-gold text-ink-950 hover:bg-gold-hi">
        <Link to="/">Back to overview</Link>
      </Button>
    </div>
  );
}
