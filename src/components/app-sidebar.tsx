"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, ListTodo, CalendarDays, Library, ChevronsRight, GraduationCap, 
  ShoppingCart, UtensilsCrossed, Target, User, LogOut, 
  CheckCircle, Notebook, Youtube, Columns3, Wallet, Timer 
} from "lucide-react";
import { 
  Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, 
  SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, 
  SidebarFooter, SidebarRail 
} from "@/components/ui/sidebar";
import { useAuth } from "./auth-provider";
import { cn } from "@/lib/utils";

// --- DESIGN SYSTEM: Glass Sidebar Styles ---
const sidebarStyles = {
    BASE: "bg-slate-950/80 backdrop-blur-xl border-r border-white/5",
    HEADER: "border-b border-white/5 pb-4",
    ITEM_DEFAULT: "text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all duration-200",
    ITEM_ACTIVE: "bg-white/10 text-white font-semibold shadow-[0_0_15px_rgba(255,255,255,0.05)]",
    ICON_BOX: "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20",
    SUB_ITEM_ACTIVE: "text-indigo-400 font-medium bg-white/5",
    SECTION_LABEL: "text-slate-500 font-bold text-xs uppercase tracking-widest px-2 py-2 mt-4"
};

const MosqueIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="24" height="24" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
        <g stroke="currentColor">
            <rect x="8" y="20" width="6" height="30" fill="currentColor" fillOpacity="0.2" />
            <polygon points="8,20 11,10 14,20" fill="currentColor" fillOpacity="0.2" />
            <line x1="8" y1="30" x2="14" y2="30" />
            <line x1="8" y1="38" x2="14" y2="38" />
            <line x1="8" y1="46" x2="14" y2="46" />

            <rect x="50" y="20" width="6" height="30" fill="currentColor" fillOpacity="0.2" />
            <polygon points="50,20 53,10 56,20" fill="currentColor" fillOpacity="0.2" />
            <line x1="50" y1="30" x2="56" y2="30" />
            <line x1="50" y1="38" x2="56" y2="38" />
            <line x1="50" y1="46" x2="56" y2="46" />

            <rect x="20" y="30" width="24" height="20" fill="currentColor" fillOpacity="0.1" />
            <path d="M20 30 Q32 15 44 30" fill="currentColor" fillOpacity="0.1" stroke="currentColor" />
            <rect x="30" y="40" width="4" height="10" fill="transparent" stroke="none"/>
        </g>
    </svg>
);

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const menuItems = [
    { href: "/", label: "Ana Sayfa", icon: Home },
    { href: "/calendar", label: "Takvim", icon: CalendarDays },
    { href: "/tasks", label: "Görevler", icon: ListTodo },
    { section: "Yaşam & İbadet" },
    { href: "/prayers", label: "Namaz Takibi", icon: MosqueIcon },
    { href: "/memorization", label: "Ezber Takibi", icon: CheckCircle },
    { href: "/goals", label: "Yol Haritaları", icon: Target },
    { section: "Organizasyon" },
    { href: "/shopping", label: "Alışveriş", icon: ShoppingCart },
    { href: "/yemek", label: "Yemek Planı", icon: UtensilsCrossed },
    { href: "/budget", label: "Bütçe", icon: Wallet },
    { href: "/tracking", label: "Takip Tablosu", icon: Columns3 },
    { href: "/pomodoro", label: "Pomodoro", icon: Timer },
    { section: "Eğitim & Gelişim" },
    { href: "/education", label: "Eğitim", icon: GraduationCap },
    { href: "/videos", label: "Video Dersler", icon: Youtube },
    { href: "/notes", label: "Notlar", icon: Notebook },
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
  ];

  const profileLink = user ? `/profile/${user.uid}` : `/login`;

  return (
    <Sidebar className={cn("border-r-0", sidebarStyles.BASE)}>
      <SidebarHeader className={cn("px-4 py-6", sidebarStyles.HEADER)}>
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl flex items-center justify-center", sidebarStyles.ICON_BOX)}>
             <ChevronsRight className="text-white w-5 h-5" />
          </div>
          <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 leading-none">
                Ailem
              </h2>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Yönetim Paneli</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {menuItems.map((item, index) => {
            // Bölüm Başlıkları
            if (item.section) {
                return (
                    <div key={index} className={sidebarStyles.SECTION_LABEL}>
                        {item.section}
                    </div>
                );
            }

            // Normal Menü Öğeleri
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href || '') && !item.subItems);
            
            return (
                <SidebarMenuItem key={item.href}>
                    <Link href={item.href || '#'} legacyBehavior={false} passHref>
                        <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.label}
                            className={cn(
                                "rounded-xl py-3 h-auto", // Daha geniş tıklama alanı
                                isActive ? sidebarStyles.ITEM_ACTIVE : sidebarStyles.ITEM_DEFAULT
                            )}
                        >
                            <span>
                                {item.icon && <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-300" : "opacity-70")} />}
                                <span className="text-sm font-medium ml-1">{item.label}</span>
                                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]" />}
                            </span>
                        </SidebarMenuButton>
                    </Link>

                    {/* Alt Menüler */}
                    {item.subItems && (
                        <SidebarMenuSub className="border-l-white/10 ml-5 pl-3 my-1 space-y-1">
                            {item.subItems.map(subItem => {
                                const isSubActive = pathname === subItem.href;
                                return (
                                    <SidebarMenuSubItem key={subItem.href}>
                                        <Link href={subItem.href} legacyBehavior={false} passHref>
                                            <SidebarMenuSubButton 
                                                asChild 
                                                isActive={isSubActive}
                                                className={cn(
                                                    "rounded-lg transition-colors",
                                                    isSubActive 
                                                        ? sidebarStyles.SUB_ITEM_ACTIVE 
                                                        : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                                                )}
                                            >
                                                <span>{subItem.label}</span>
                                            </SidebarMenuSubButton>
                                        </Link>
                                    </SidebarMenuSubItem>
                                )
                            })}
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/5 p-4 bg-black/20">
        <SidebarMenu>
            {/* Profil Linki */}
            <SidebarMenuItem>
                <Link href={profileLink} legacyBehavior={false} passHref>
                    <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith('/profile/')}
                        className={cn("rounded-xl h-12", pathname.startsWith('/profile/') ? sidebarStyles.ITEM_ACTIVE : sidebarStyles.ITEM_DEFAULT)}
                    >
                        <span>
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 p-[1.5px]">
                                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                                    <User className="w-4 h-4 text-slate-300" />
                                </div>
                            </div>
                            <span className="font-semibold">Profilim</span>
                        </span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>

            {/* Çıkış Yap */}
            <SidebarMenuItem>
                <SidebarMenuButton 
                    onClick={logout} 
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl h-10 mt-1 transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Çıkış Yap</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail className="hover:after:bg-indigo-500/50" />
    </Sidebar>
  );
}