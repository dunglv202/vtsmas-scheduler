import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function MobileMenuButton() {
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();

  if (!isMobile) {
    return null;
  }

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      onClick={() => setOpenMobile(true)}
      className={cn("fixed right-4 bottom-4 z-50 w-auto md:hidden")}
    >
      <div className="bg-sidebar-primary text-sidebar-primary-foreground flex items-center gap-2 px-3 py-2 rounded-lg">
        <Menu className="h-5 w-5" />
        <span>Menu</span>
      </div>
    </Button>
  );
}
