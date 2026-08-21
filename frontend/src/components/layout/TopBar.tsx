import { Menu, Search, Bell, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@/components/shared/VisuallyHidden";
import { SidebarNav } from "./SidebarNav";
import type { EscalationCardData } from "@/lib/types";

interface TopBarProps {
  mobileNavOpen: boolean;
  onMobileNavOpenChange: (open: boolean) => void;
  onOpenCommandMenu: () => void;
  onNewBrief: () => void;
  onReload: () => void;
  loading: boolean;
  escalations: EscalationCardData[];
  navBadges: Record<string, number>;
}

export function TopBar({
  mobileNavOpen,
  onMobileNavOpenChange,
  onOpenCommandMenu,
  onNewBrief,
  onReload,
  loading,
  escalations,
  navBadges,
}: TopBarProps) {
  const openEscalations = escalations.filter((e) => !e.resolved);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 md:px-6 h-16">
        <Sheet open={mobileNavOpen} onOpenChange={onMobileNavOpenChange}>
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation menu"
            onClick={() => onMobileNavOpenChange(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <SheetContent side="left" className="w-72 bg-navy-950 p-0 border-navy-line">
            <VisuallyHidden>
              <SheetTitle>Navigation</SheetTitle>
            </VisuallyHidden>
            <SidebarNav badges={navBadges} onNavigate={() => onMobileNavOpenChange(false)} />
          </SheetContent>
        </Sheet>

        <div className="hidden md:flex items-center gap-2 text-sm shrink-0">
          <span className="text-muted-foreground">Workspace</span>
          <span className="font-medium text-foreground">Ignite '26</span>
        </div>

        <button
          type="button"
          onClick={onOpenCommandMenu}
          className="flex-1 min-w-0 max-w-md flex items-center gap-2 rounded-md border border-border bg-surface-muted/60 px-3 py-2 text-sm text-muted-foreground hover:border-border-strong hover:bg-surface-muted transition-colors"
        >
          <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">Search briefs, vendors, receipts…</span>
          <kbd className="ml-auto hidden sm:inline-block text-[10px] font-mono border border-border-strong rounded px-1.5 py-0.5 text-ink-faint bg-surface">
            ⌘K
          </kbd>
        </button>

        <Button
          variant="outline"
          size="icon"
          className="hidden sm:inline-flex"
          aria-label="Re-run pipeline"
          title="Re-run pipeline"
          onClick={onReload}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {openEscalations.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-danger text-[10px] font-bold text-white flex items-center justify-center">
                  {openEscalations.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {openEscalations.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">
                No open escalations. You're all caught up.
              </div>
            ) : (
              openEscalations.map((e) => (
                <DropdownMenuItem key={e.id} className="flex flex-col items-start gap-0.5 py-2">
                  <span className="text-xs font-mono text-danger">{e.brief_id}</span>
                  <span className="text-sm">{e.reason}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={onNewBrief} size="sm" className="gap-1.5 hidden sm:inline-flex">
          <Plus className="h-4 w-4" />
          New procurement brief
        </Button>
        <Button onClick={onNewBrief} size="icon" className="sm:hidden" aria-label="New procurement brief">
          <Plus className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="User menu" className="rounded-full shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-navy-950 text-navy-text text-xs">AN</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ananya · Logistics Coordinator</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile settings</DropdownMenuItem>
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {escalations.length > 0 && (
        <div className="sr-only" role="status" aria-live="polite">
          {openEscalations.length} escalation{openEscalations.length === 1 ? "" : "s"} awaiting approval
        </div>
      )}
    </header>
  );
}
