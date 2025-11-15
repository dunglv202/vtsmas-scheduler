import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { clearStoredTokens } from "@/lib/auth";
import { Bell, Calendar, LogOut, User } from "lucide-react";
import { Link } from "react-router-dom";

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

export function AppSidebar() {
  return (
    <Sidebar collapsible="none" className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r h-screen">
      <SidebarHeader>
        <SidebarTrigger className="px-4" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="space-y-2 mt-2">
          {menuItems.map((item, idx) => (
            <SidebarMenuItem key={idx}>
              {!!item.href ? (
                <Link to={item.href!}>
                  <SidebarMenuButton
                    tooltip={{
                      children: item.label,
                      hidden: false,
                    }}
                    className="px-3.5"
                  >
                    {item.icon}
                  </SidebarMenuButton>
                </Link>
              ) : (
                <SidebarMenuButton
                  tooltip={{
                    children: item.label,
                    hidden: false,
                  }}
                  className="px-3.5"
                  onClick={item.action}
                >
                  {item.icon}
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter></SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
