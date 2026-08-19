import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePipeline } from "@/hooks/usePipeline";
import { SidebarNav } from "./SidebarNav";
import { TopBar } from "./TopBar";
import { CommandMenu } from "./CommandMenu";
import { CreateBriefDialog } from "@/components/brief/CreateBriefDialog";
import type { PipelineContextValue } from "@/hooks/usePipelineContext";
import { buildSecurityEvents } from "@/lib/securityEvents";

export function AppShell() {
  const pipelineState = usePipeline();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [createBriefOpen, setCreateBriefOpen] = useState(false);

  const openEscalations = pipelineState.pipeline?.escalations.filter((e) => !e.resolved) ?? [];
  const securityEventCount = buildSecurityEvents(pipelineState.pipeline ?? null).length;

  const navBadges = {
    Approvals: openEscalations.length,
    "Security events": securityEventCount,
  };

  const context: PipelineContextValue = {
    ...pipelineState,
    openCreateBrief: () => setCreateBriefOpen(true),
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
        <aside className="hidden lg:block sticky top-0 h-screen">
          <SidebarNav badges={navBadges} />
        </aside>

        <div className="flex flex-col min-h-screen min-w-0">
          <TopBar
            mobileNavOpen={mobileNavOpen}
            onMobileNavOpenChange={setMobileNavOpen}
            onOpenCommandMenu={() => setCommandOpen(true)}
            onNewBrief={() => setCreateBriefOpen(true)}
            onReload={pipelineState.reload}
            loading={pipelineState.loading}
            escalations={pipelineState.pipeline?.escalations ?? []}
            navBadges={navBadges}
          />
          <main id="main-content" className="flex-1 px-4 md:px-6 lg:px-8 py-6 md:py-8 max-w-[1500px] w-full">
            <Outlet context={context} />
          </main>
          <footer className="px-4 md:px-6 lg:px-8 py-6 text-xs text-ink-faint border-t border-border">
            ProcureX · Autonomous Commerce Engineering — deterministic code decides, the LLM only
            ever proposes.
          </footer>
        </div>
      </div>

      <CommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNewBrief={() => setCreateBriefOpen(true)}
      />
      <CreateBriefDialog
        open={createBriefOpen}
        onOpenChange={setCreateBriefOpen}
        pool={pipelineState.pipeline?.pool}
        onCreated={pipelineState.createBrief}
      />
      <Toaster theme="light" position="bottom-right" richColors closeButton />
    </TooltipProvider>
  );
}
