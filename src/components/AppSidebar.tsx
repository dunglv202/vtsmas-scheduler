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
import { Calendar, LogOut, User } from "lucide-react";

const menuItems: {
  icon: React.ReactNode;
  label: string;
  href: string;
}[] = [
  {
    icon: <Calendar />,
    label: "Lịch",
    href: "/teaching-schedule",
  },
  {
    icon: <User />,
    label: "Cá nhân",
    href: "/profile",
  },
  {
    icon: <LogOut />,
    label: "Đăng xuất",
    href: "/logout",
  },
];

export function AppSidebar() {
  return (
    <Sidebar
      collapsible="none"
      className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r h-screen"
    >
      <SidebarHeader>
        <SidebarTrigger className="px-4" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="space-y-2 mt-2">
          {menuItems.map((item, idx) => (
            <SidebarMenuItem key={idx}>
              <a href={item.href}>
                <SidebarMenuButton
                  tooltip={{
                    children: item.label,
                    hidden: false,
                  }}
                  className="px-3.5"
                >
                  {item.icon}
                </SidebarMenuButton>
              </a>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter></SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
