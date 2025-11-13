"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { clearStoredTokens } from "@/lib/auth";
import { LogOut } from "lucide-react";
import * as React from "react";

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleLogout = () => {
    clearStoredTokens();
    setOpen(false);
    // Use window.location for a full page reload to ensure clean logout
    window.location.href = "/login";
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Tìm kiếm lệnh..." />
      <CommandList>
        <CommandEmpty>Không tìm thấy lệnh.</CommandEmpty>
        <CommandGroup heading="Tài khoản">
          <CommandItem onSelect={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Đăng xuất</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
