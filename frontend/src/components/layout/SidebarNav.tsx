import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";
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
 * the mobile Sheet drawer, so behaviour never drifts between breakpoints.
 * Deliberately dark navy chrome against the light content area — the one
 * place in the app that isn't white. */
export function SidebarNav({ badges, onNavigate }: SidebarNavProps) {
  return (
    <div className="flex h-full flex-col bg-navy-950 text-navy-text">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-md bg-brand flex items-center justify-center font-display font-bold text-sm text-white shrink-0"
            aria-hidden="true"
          >
            Px
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-[15px] font-semibold text-navy-text leading-tight truncate">
              ProcureX
            </h1>
            <p className="text-[10.5px] text-navy-text-faint leading-tight truncate">
              Procurement, under control
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
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-navy-800 text-white"
                        : "text-navy-text-soft hover:bg-navy-900 hover:text-navy-text"
                    )
                  }
                >
                  <item.icon className="h-[17px] w-[17px] shrink-0" aria-hidden="true" strokeWidth={1.75} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {!!count && (
                    <span className="inline-flex items-center justify-center rounded-full bg-danger px-1.5 h-[18px] min-w-[18px] text-[10px] font-semibold text-white tabular-nums">
                      {count}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-navy-line px-3 py-3 flex flex-col gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-navy-900 transition-colors w-full"
            >
              <span className="h-6 w-6 rounded-md bg-navy-800 text-navy-text-soft flex items-center justify-center text-[11px] font-semibold shrink-0">
                I26
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-navy-text truncate">Ignite '26</span>
                <span className="block text-[10.5px] text-navy-text-faint truncate">Workspace</span>
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-navy-text-faint shrink-0" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem disabled className="text-success">
              ✓ Ignite '26 — active
            </DropdownMenuItem>
            <DropdownMenuItem disabled>+ New workspace (demo-only)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-navy-900 transition-colors w-full"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-navy-800 text-navy-text text-[11px]">AN</AvatarFallback>
              </Avatar>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-navy-text truncate">Ananya</span>
                <span className="block text-[10.5px] text-navy-text-faint truncate">Logistics Coordinator</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem disabled>ananya@ignite26.events</DropdownMenuItem>
            <DropdownMenuItem>Profile settings</DropdownMenuItem>
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2 px-2.5 pt-2 text-[11px] text-navy-text-faint">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft shrink-0" aria-hidden="true" />
          All systems operational
        </div>
      </div>
    </div>
  );
}
