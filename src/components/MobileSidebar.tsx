import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { clearStoredTokens } from "@/lib/auth";
import { Bell, Calendar, GraduationCap, LogOut, NotebookPen, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const menuItems: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  action?: () => void;
}[] = [
  {
    icon: <Calendar />,
    label: "Lịch",
    href: "/teaching-schedule",
  },
  {
    icon: <GraduationCap />,
    label: "Lớp học",
    href: "/classes",
  },
  {
    icon: <NotebookPen className="size-4! ml-px" />,
    label: "Sổ điểm",
    href: "/score-book",
  },
  {
    icon: <User />,
    label: "Tài khoản",
    href: "/account",
  },
  {
    icon: <Bell />,
    label: "Thông báo",
    href: "/notifications",
  },
  {
    icon: <LogOut />,
    label: "Đăng xuất",
    action() {
      clearStoredTokens();
      window.location.href = "/login";
    },
  },
];

export function MobileSidebar() {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return null;
  }

  return (
    <Sidebar collapsible="offcanvas" className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r h-screen">
      <SidebarHeader></SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="space-y-2 mt-2">
          {menuItems.map((item, idx) => (
            <SidebarMenuItem key={idx}>
              {!!item.href ? (
                <Link to={item.href!} className="block">
                  <SidebarMenuButton className="px-3.5 w-full justify-start gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              ) : (
                <div onClick={item.action} className="cursor-pointer">
                  <SidebarMenuButton className="px-3.5 w-full justify-start gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </div>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter></SidebarFooter>
    </Sidebar>
  );
}
