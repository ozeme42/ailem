
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListTodo, CalendarDays, Library, ChevronsRight, Camera, GraduationCap, ShoppingCart } from "lucide-react";
import { Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = usePathname();

  const menuItems = [
    { href: "/", label: "Ana Sayfa", icon: Home },
    { href: "/tasks", label: "Görevler", icon: ListTodo },
    { href: "/calendar", label: "Takvim", icon: CalendarDays },
    { href: "/library", label: "Kütüphane", icon: Library },
    { href: "/education", label: "Eğitim", icon: GraduationCap },
    { href: "/shopping", label: "Alışveriş", icon: ShoppingCart },
    { href: "/actions", label: "Hızlı İşlemler", icon: Camera },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
             <ChevronsRight className="text-white" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Ailem
          </h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior={false} passHref>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <span>
                    <item.icon />
                    <span>{item.label}</span>
                  </span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
