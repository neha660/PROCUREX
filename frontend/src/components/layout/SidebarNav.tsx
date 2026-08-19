import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarNavProps {
  badges?: Partial<Record<(typeof NAV_ITEMS)[number]["label"], number>>;
  onNavigate?: () => void;
}

/** Shared nav content — rendered inside the fixed desktop rail and inside
 * the mobile Sheet drawer, so behaviour never drifts between breakpoints. */
export function SidebarNav({ badges, onNavigate }: SidebarNavProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-lg bg-gold text-ink-950 flex items-center justify-center font-display font-bold text-sm shrink-0"
            aria-hidden="true"
          >
            Px
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-text-hi leading-tight">
              ProcureX
            </h1>
            <p className="text-[10.5px] text-text-dim leading-tight">
              Autonomous where it can. Accountable where it must.
            </p>
          </div>
        </div>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const count = badges?.[item.label];
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={"end" in item ? item.end : false}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-gold/12 text-gold-hi"
                        : "text-text-mid hover:bg-ink-800 hover:text-text-hi"
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {!!count && (
                    <Badge
                      variant="outline"
                      className="border-coral/40 bg-coral/15 text-coral-hi text-[10px] px-1.5 h-5 min-w-5 justify-center"
                    >
                      {count}
                    </Badge>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-line px-3 py-3 flex flex-col gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-ink-800 transition-colors w-full"
            >
              <span className="h-6 w-6 rounded-md bg-ink-700 text-gold-hi flex items-center justify-center text-[11px] font-semibold shrink-0">
                I26
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-text-hi truncate">Ignite '26</span>
                <span className="block text-[10.5px] text-text-dim truncate">Workspace</span>
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-text-dim shrink-0" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem disabled className="text-sage-hi">
              ✓ Ignite '26 — active
            </DropdownMenuItem>
            <DropdownMenuItem disabled>+ New workspace (demo-only)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-ink-800 transition-colors w-full"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-ink-700 text-text-hi text-[11px]">AN</AvatarFallback>
              </Avatar>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-text-hi truncate">Ananya</span>
                <span className="block text-[10.5px] text-text-dim truncate">Logistics Coordinator</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem disabled>ananya@ignite26.events</DropdownMenuItem>
            <DropdownMenuItem>Profile settings</DropdownMenuItem>
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2 px-2.5 py-1 text-[11px] text-text-dim font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-sage animate-pulse-soft shrink-0" aria-hidden="true" />
          All systems operational
        </div>
      </div>
    </div>
  );
}
