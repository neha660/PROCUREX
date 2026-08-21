import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

const STAGES = [
  "Brief parsed",
  "Vendors discovered",
  "Trust check",
  "Hard constraints",
  "Score & negotiate",
  "Authorisation",
  "Purchase or escalation",
] as const;

interface PipelineStepperProps {
  /** How many stages are complete (0-7). Defaults to "all but the last". */
  activeIndex?: number;
  /** Outcome of the final stage — colours the last node/label. */
  outcome?: "purchased" | "escalated" | "pending";
}

export function PipelineStepper({
  activeIndex = STAGES.length - 1,
  outcome = "purchased",
}: PipelineStepperProps) {
  return (
    <ol
      aria-label="Procurement pipeline progress"
      className="flex items-start w-full overflow-x-auto pb-1"
    >
      {STAGES.map((stage, i) => {
        const done = i <= activeIndex;
        const isLast = i === STAGES.length - 1;
        const isFinalBad = isLast && outcome === "escalated";
        const isFinalPending = isLast && outcome === "pending";

        return (
          <li key={stage} className="flex items-start shrink-0">
            <div className="flex flex-col items-center gap-1.5 w-20 md:w-24">
              <div
                className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center transition-colors shrink-0",
                  !done && "bg-border-strong",
                  done && !isFinalBad && !isFinalPending && "bg-success text-white",
                  done && isFinalBad && "bg-danger text-white",
                  done && isFinalPending && "bg-warning text-white animate-pulse-soft"
                )}
                aria-hidden="true"
              >
                {done && !isFinalBad && <Check className="h-3 w-3" strokeWidth={3} />}
                {done && isFinalBad && <X className="h-3 w-3" strokeWidth={3} />}
              </div>
              <span
                className={cn(
                  "text-[10.5px] font-medium uppercase tracking-wide text-center leading-tight",
                  done ? "text-ink-soft" : "text-ink-faint"
                )}
              >
                {stage}
                {isLast && done && (
                  <span className="sr-only">
                    {" "}
                    — {outcome === "escalated" ? "escalated to human" : outcome === "pending" ? "in progress" : "purchase confirmed"}
                  </span>
                )}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={cn("h-px w-6 md:w-10 mx-0.5 mt-2.5", i < activeIndex ? "bg-success/40" : "bg-border-strong")}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
