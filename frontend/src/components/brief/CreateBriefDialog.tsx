import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, PenLine, Wallet, Rocket } from "lucide-react";
import { api, inr } from "@/lib/api";
import type { BuyingBrief, PipelineResult } from "@/lib/types";

type Draft = {
  title: string;
  quantity: number;
  min_ram_gb: number | null;
  min_ssd_gb: number | null;
  max_unit_price_inr: number;
  max_delivery_days: number;
  requires_warranty: boolean;
  bulk_tier_qty: number | null;
  bulk_tier_price_inr: number | null;
  raw_text: string;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  quantity: 1,
  min_ram_gb: null,
  min_ssd_gb: null,
  max_unit_price_inr: 0,
  max_delivery_days: 7,
  requires_warranty: false,
  bulk_tier_qty: null,
  bulk_tier_price_inr: null,
  raw_text: "",
};

const STEPS = [
  { label: "Describe", icon: PenLine },
  { label: "Review constraints", icon: Sparkles },
  { label: "Shared budget", icon: Wallet },
  { label: "Discover vendors", icon: Rocket },
] as const;

export function CreateBriefDialog({
  open,
  onOpenChange,
  pool,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pool: PipelineResult["pool"] | undefined;
  onCreated: (draft: Partial<BuyingBrief>) => Promise<PipelineResult>;
}) {
  const [step, setStep] = useState(0);
  const [text, setText] = useState(
    "Need 20 wireless presenter remotes, budget ₹900 per unit, delivery within 4 days, 6-month warranty"
  );
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep(0);
    setDraft(EMPTY_DRAFT);
    setError(null);
  };

  const handleParse = async () => {
    setParsing(true);
    setError(null);
    try {
      const result = await api.parseBrief(text);
      setDraft({
        title: result.title || text.slice(0, 60),
        quantity: result.quantity ?? 1,
        min_ram_gb: result.min_ram_gb ?? null,
        min_ssd_gb: result.min_ssd_gb ?? null,
        max_unit_price_inr: result.max_unit_price_inr ?? 0,
        max_delivery_days: result.max_delivery_days ?? 7,
        requires_warranty: result.requires_warranty ?? false,
        bulk_tier_qty: result.bulk_tier_qty ?? null,
        bulk_tier_price_inr: result.bulk_tier_price_inr ?? null,
        raw_text: text,
      });
      setStep(1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setParsing(false);
    }
  };

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onCreated(draft);
      toast.success(`"${draft.title}" is now discovering vendors`, {
        description: "Added to the shared ₹65,00,000 pool alongside the existing briefs.",
      });
      onOpenChange(false);
      reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New procurement brief</DialogTitle>
          <DialogDescription>
            Describe what you need in plain language — ProcureX extracts the hard constraints,
            you confirm them, then discovery starts against the same shared pool.
          </DialogDescription>
        </DialogHeader>

        <ol className="flex items-center gap-1.5 mb-1" aria-label="Wizard progress">
          {STEPS.map((s, i) => (
            <li key={s.label} className="flex items-center gap-1.5 flex-1">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  i <= step ? "bg-gold text-ink-950" : "bg-ink-800 text-text-dim"
                }`}
                aria-current={i === step ? "step" : undefined}
              >
                <s.icon className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 ${i < step ? "bg-gold/50" : "bg-ink-700"}`} aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
        <p className="text-xs font-mono uppercase tracking-wide text-text-dim -mt-1 mb-2">
          Step {step + 1} of {STEPS.length} — {STEPS[step].label}
        </p>

        {error && (
          <div className="text-sm text-coral-hi bg-coral/10 border border-coral/30 rounded-md p-3">
            {error}
          </div>
        )}

        {step === 0 && (
          <div className="flex flex-col gap-3">
            <Label htmlFor="brief-text">Describe the requirement</Label>
            <Textarea
              id="brief-text"
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Need 15 wireless presenter remotes, budget ₹900 per unit, delivery within 4 days"
            />
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="f-title">Title</Label>
              <Input id="f-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <Field label="Quantity" hard>
              <Input
                type="number"
                min={1}
                value={draft.quantity}
                onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })}
              />
            </Field>
            <Field label="Unit budget cap (₹)" hard>
              <Input
                type="number"
                min={0}
                value={draft.max_unit_price_inr}
                onChange={(e) => setDraft({ ...draft, max_unit_price_inr: Number(e.target.value) })}
              />
            </Field>
            <Field label="Min RAM (GB)">
              <Input
                type="number"
                value={draft.min_ram_gb ?? ""}
                onChange={(e) => setDraft({ ...draft, min_ram_gb: e.target.value ? Number(e.target.value) : null })}
              />
            </Field>
            <Field label="Min SSD (GB)">
              <Input
                type="number"
                value={draft.min_ssd_gb ?? ""}
                onChange={(e) => setDraft({ ...draft, min_ssd_gb: e.target.value ? Number(e.target.value) : null })}
              />
            </Field>
            <Field label="Delivery deadline (days)" hard>
              <Input
                type="number"
                min={1}
                value={draft.max_delivery_days}
                onChange={(e) => setDraft({ ...draft, max_delivery_days: Number(e.target.value) })}
              />
            </Field>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="f-warranty"
                checked={draft.requires_warranty}
                onCheckedChange={(v) => setDraft({ ...draft, requires_warranty: v === true })}
              />
              <Label htmlFor="f-warranty" className="font-normal">
                Warranty required <HardBadge />
              </Label>
            </div>
            <p className="col-span-2 text-[11px] text-text-dim">
              Fields marked <HardBadge /> are hard constraints — the deterministic firewall
              rejects any vendor that fails them, no exceptions.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-line p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-dim">Shared pool total</span>
                <span className="text-text-hi font-medium">{inr(pool?.total_inr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim">Already committed</span>
                <span className="text-text-hi font-medium">{inr(pool?.allocated_inr)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-text-dim">This brief's ceiling</span>
                <span className="text-gold-hi font-medium">
                  {inr(draft.max_unit_price_inr * draft.quantity)}
                </span>
              </div>
            </div>
            <p className="text-sm text-text-mid">
              This brief draws from the <strong className="text-text-hi">same shared pool</strong> as
              every other Ignite '26 brief — not an isolated budget. If its negotiated price exceeds
              its own cap, ProcureX checks banked savings from other briefs before ever escalating to
              you.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-text-mid">Ready to discover vendors for:</p>
            <div className="rounded-lg border border-line p-4">
              <div className="font-display text-base font-semibold text-text-hi">{draft.title}</div>
              <div className="text-text-mid mt-1">
                Qty {draft.quantity} · cap {inr(draft.max_unit_price_inr)}/unit · ≤{draft.max_delivery_days}d delivery
              </div>
            </div>
            <p className="text-text-dim text-xs">
              ProcureX will run vendor discovery, the constraint firewall, weighted scoring, and
              authorisation for this brief immediately, using the same pipeline as the seeded
              briefs.
            </p>
          </div>
        )}

        <DialogFooter className="mt-2">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={parsing || submitting}>
              Back
            </Button>
          )}
          {step === 0 && (
            <Button onClick={handleParse} disabled={!text.trim() || parsing} className="gap-1.5">
              {parsing && <Loader2 className="h-4 w-4 animate-spin" />}
              {parsing ? "Parsing…" : "Parse brief"}
            </Button>
          )}
          {step === 1 && (
            <Button
              onClick={() => setStep(2)}
              disabled={!draft.title || draft.quantity < 1 || draft.max_unit_price_inr <= 0}
            >
              Continue
            </Button>
          )}
          {step === 2 && <Button onClick={() => setStep(3)}>Continue</Button>}
          {step === 3 && (
            <Button onClick={handleCreate} disabled={submitting} className="gap-1.5 bg-gold text-ink-950 hover:bg-gold-hi">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Starting…" : "Start vendor discovery"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hard, children }: { label: string; hard?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="flex items-center gap-1.5">
        {label} {hard && <HardBadge />}
      </Label>
      {children}
    </div>
  );
}

function HardBadge() {
  return (
    <Badge variant="outline" className="border-gold/40 text-gold-hi text-[10px] px-1.5 py-0">
      hard
    </Badge>
  );
}
