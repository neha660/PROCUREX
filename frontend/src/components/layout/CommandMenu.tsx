import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { NAV_ITEMS } from "./nav-items";
import { FilePlus2 } from "lucide-react";

export function CommandMenu({
  open,
  onOpenChange,
  onNewBrief,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewBrief: () => void;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command menu"
      description="Jump to a page or run a quick action"
    >
      <CommandInput placeholder="Search pages, briefs, vendors…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick action">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onNewBrief();
            }}
          >
            <FilePlus2 />
            New procurement brief
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Go to">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.to}
              onSelect={() => {
                onOpenChange(false);
                navigate(item.to);
              }}
            >
              <item.icon />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
