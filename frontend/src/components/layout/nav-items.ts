import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  UserCheck,
  ScrollText,
  ShieldAlert,
  Settings,
} from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/briefs", label: "Buying briefs", icon: ClipboardList },
  { to: "/vendors", label: "Vendor discovery", icon: Building2 },
  { to: "/approvals", label: "Approvals", icon: UserCheck },
  { to: "/audit", label: "Audit trail", icon: ScrollText },
  { to: "/security", label: "Security events", icon: ShieldAlert },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;
