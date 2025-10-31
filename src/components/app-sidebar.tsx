
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListTodo, CalendarDays, Library, ChevronsRight, GraduationCap, ShoppingCart, UtensilsCrossed, BookHeart, Target, User, LogOut, Moon, CheckCircle, Zap, Notebook, Youtube, BrainCircuit, Columns3, Wallet, BarChart2 } from "lucide-react";
import { Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, SidebarFooter } from "@/components/ui/sidebar";
import { useAuth } from "./auth-provider";
import { Button } from "./ui/button";

const MosqueIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
        <g stroke="currentColor">
            <rect x="8" y="20" width="6" height="30" fill="currentColor" />
            <polygon points="8,20 11,10 14,20" fill="currentColor" />
            <line x1="8" y1="30" x2="14" y2="30" />
            <line x1="8" y1="38" x2="14" y2="38" />
            <line x1="8" y1="46" x2="14" y2="46" />

            <rect x="50" y="20" width="6" height="30" fill="currentColor" />
            <polygon points="50,20 53,10 56,20" fill="currentColor" />
            <line x1="50" y1="30" x2="56" y2="30" />
            <line x1="50" y1="38" x2="56" y2="38" />
            <line x1="50" y1="46" x2="56" y2="46" />

            <rect x="20" y="30" width="24" height="20" fill="currentColor" />
            <path d="M20 30 Q32 15 44 30" fill="currentColor" stroke="currentColor" />

            <rect x="30" y="40" width="4" height="10" fill="hsl(var(--background))" stroke="none"/>
        </g>
    </svg>
);


export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const menuItems = [
    { href: "/", label: "Ana Sayfa", icon: Home },
    { href: "/tasks", label: "Görevler", icon: ListTodo },
    { href: "/prayers", label: "Namaz Takibi", icon: MosqueIcon },
    { href: "/tracking", label: "Takip Tablosu", icon: Columns3 },
    { href: "/calendar", label: "Takvim", icon: CalendarDays },
    { href: "/yemek", label: "Yemek Planı", icon: UtensilsCrossed },
    { href: "/budget", label: "Bütçe", icon: Wallet },
    { href: "/goals", label: "Yol Haritaları", icon: Target },
    { href: "/memorization", label: "Ezber Takibi", icon: CheckCircle },
    { href: "/notes", label: "Notlar", icon: Notebook },
    { href: "/videos", label: "Video Dersler", icon: Youtube },
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
    { href: "/education", label: "Eğitim", icon: GraduationCap },
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
                    isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && !item.subItems)}
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
