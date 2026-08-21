const STAGES = ["Intake", "Justification", "Discovery", "Sanitizer", "Firewall", "Scorer", "Negotiation", "Authorisation"];

export default function PipelineStepper({ activeIndex = STAGES.length - 1 }) {
  return (
    <div className="flex w-full min-w-0 items-start overflow-x-auto">
      {STAGES.map((stage, i) => {
        const done = i <= activeIndex;
        return (
          <div key={stage} className="flex shrink-0 items-start">
            <div className="flex w-16 flex-col items-center gap-2 sm:w-20">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                  done ? "bg-brand-600 text-white" : "bg-surface-muted text-text-dim"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-center text-[11px] font-medium leading-tight ${
                  done ? "text-text-mid" : "text-text-dim/70"
                }`}
              >
                {stage}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`mt-3 h-px w-6 shrink-0 sm:w-10 ${i < activeIndex ? "bg-brand-500/40" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
