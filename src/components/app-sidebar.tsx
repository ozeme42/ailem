
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListTodo, CalendarDays, Library, ChevronsRight, GraduationCap, ShoppingCart, UtensilsCrossed, BookHeart, Target, User, LogOut } from "lucide-react";
import { Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, SidebarFooter } from "@/components/ui/sidebar";
import { useAuth } from "./auth-provider";
import { Button } from "./ui/button";

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const menuItems = [
    { href: "/", label: "Ana Sayfa", icon: Home },
    { href: "/tasks", label: "Görevler", icon: ListTodo },
    { href: "/calendar", label: "Takvim", icon: CalendarDays },
    { href: "/yemek", label: "Yemek Planı", icon: UtensilsCrossed },
    { href: "/goals", label: "Yol Haritaları", icon: Target },
    { 
      href: "/library", 
      label: "Kütüphane", 
      icon: Library,
      subItems: [
          { href: "/library", label: "Kitaplığım" },
          { href: "/library/archive", label: "Kitaplığımız" },
          { href: "/library/stats", label: "İstatistikler" },
      ]
    },
    { 
      href: "/education", 
      label: "Eğitim", 
      icon: GraduationCap,
      subItems: [
          { href: "/education", label: "Genel Bakış" },
          { href: "/education/study", label: "Konu Anlatımı" },
          { href: "/education/management", label: "Yönetim" },
      ]
    },
    { href: "/shopping", label: "Alışveriş", icon: ShoppingCart },
  ];

  const profileLink = user ? `/profile/${user.uid}` : `/login`;

  return (
    <Sidebar className="hidden md:block">
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
                    isActive={pathname.startsWith(item.href) && (!item.subItems || pathname === item.href)}
                    tooltip={item.label}
                    >
                    <span>
                        <item.icon />
                        <span>{item.label}</span>
                    </span>
                    </SidebarMenuButton>
                </Link>
                {item.subItems && (
                     <SidebarMenuSub>
                        {item.subItems.map(subItem => (
                             <SidebarMenuSubItem key={subItem.href}>
                                <Link href={subItem.href} legacyBehavior={false} passHref>
                                    <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                                        <span>{subItem.label}</span>
                                    </SidebarMenuSubButton>
                                </Link>
                             </SidebarMenuSubItem>
                        ))}
                     </SidebarMenuSub>
                )}
            </SidebarMenuItem>
          ))}
            <SidebarMenuItem>
                 <Link href={profileLink} legacyBehavior={false} passHref>
                    <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith('/profile/')}
                        tooltip="Profilim"
                    >
                        <span>
                            <User />
                            <span>Profilim</span>
                        </span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
       <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout}>
              <LogOut />
              <span>Çıkış Yap</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
