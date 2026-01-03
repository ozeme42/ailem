"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, ListTodo, CalendarDays, Library, ChevronsRight, GraduationCap, 
  ShoppingCart, UtensilsCrossed, Target, User, LogOut, 
  CheckCircle, Notebook, Youtube, Columns3, Wallet, Timer, PanelLeft 
} from "lucide-react";
import { 
  Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, 
  SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, 
  SidebarFooter, SidebarRail, useSidebar 
} from "@/components/ui/sidebar";
import { useAuth } from "./auth-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// --- DESIGN SYSTEM: LIGHT GLASS THEME ---
const sidebarStyles = {
    // !bg-white/90: Yarı saydam beyaz arka plan
    // border-slate-200: İnce gri kenarlık
    BASE: "!bg-white/90 backdrop-blur-2xl border-r border-slate-200 shadow-xl transition-all duration-300",
    
    HEADER: "border-b border-slate-100 pb-4",
    
    // Menü öğeleri: Koyu gri metin, hover olunca açık gri zemin
    ITEM_DEFAULT: "text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200",
    
    // Aktif öğe: İndigo zemin, beyaz yazı (Beyaz üzerinde kontrast sağlar)
    ITEM_ACTIVE: "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20 hover:bg-indigo-700",
    
    // Logo Kutusu
    ICON_BOX: "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 text-white",
    
    // Alt menü aktif: Hafif indigo zemin, koyu indigo yazı
    SUB_ITEM_ACTIVE: "text-indigo-700 font-medium bg-indigo-50 border-l-2 border-indigo-600 pl-2",
    
    // Alt menü pasif
    SUB_ITEM_DEFAULT: "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-2 border-transparent pl-2",

    // Bölüm başlıkları
    SECTION_LABEL: "text-slate-400 font-bold text-[10px] uppercase tracking-wider px-3 py-2 mt-4 opacity-100 group-data-[collapsible=icon]:hidden transition-all"
};

// Cami İkonu (Renkleri currentcolor ile otomatik alacak)
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
  const { toggleSidebar, state } = useSidebar(); 
  
  const isCollapsed = state === "collapsed";

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
    <Sidebar 
        collapsible="icon" 
        className={cn("border-r-0", sidebarStyles.BASE)}
        // Inline style ile arka planı override ediyoruz (Saydam beyaz)
        style={
            {
                "--sidebar-background": "transparent",
                backgroundColor: "rgba(255, 255, 255, 0.85)" 
            } as React.CSSProperties
        }
    >
      
      {/* --- HEADER --- */}
      <SidebarHeader className={cn("px-4 py-5 h-[72px] flex justify-center", sidebarStyles.HEADER)}>
        <div className="flex items-center w-full justify-between group-data-[collapsible=icon]:justify-center">
            
            {/* LOGO ALANI */}
            <div className={cn("flex items-center gap-3 transition-all duration-300", isCollapsed ? "hidden w-0 opacity-0" : "flex w-auto opacity-100")}>
                <div className={cn("p-2 rounded-xl flex items-center justify-center shrink-0", sidebarStyles.ICON_BOX)}>
                    <ChevronsRight className="w-5 h-5" />
                </div>
                <div className="flex flex-col overflow-hidden">
                    <h2 className="text-lg font-black tracking-tight text-slate-800 leading-none whitespace-nowrap">
                        Ailem
                    </h2>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 whitespace-nowrap">Yönetim Paneli</span>
                </div>
            </div>

            {/* TOGGLE BUTONU */}
            <Button 
                onClick={toggleSidebar} 
                variant="ghost" 
                size="icon" 
                className={cn(
                    "h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all",
                    isCollapsed && "h-9 w-9 bg-white text-indigo-600 hover:bg-indigo-50 fixed left-4 top-5 z-50 shadow-md border border-slate-200"
                )}
            >
                <PanelLeft className="w-5 h-5" />
                <span className="sr-only">Menüyü Aç/Kapat</span>
            </Button>
        </div>
      </SidebarHeader>

      {/* --- CONTENT --- */}
      <SidebarContent className="px-3 py-4 custom-scrollbar">
        <SidebarMenu>
          {menuItems.map((item, index) => {
            if (item.section) {
                return (
                    <div key={index} className={sidebarStyles.SECTION_LABEL}>
                        {item.section}
                    </div>
                );
            }

            // isActive logic: Eğer ana link ise veya alt menülerden biri aktif değilse ve path uyuyorsa
            const isSubItemActive = item.subItems?.some(sub => pathname === sub.href);
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href || '') && !item.subItems) || isSubItemActive;
            
            return (
                <SidebarMenuItem key={item.href}>
                    <Link href={item.href || '#'} legacyBehavior={false} passHref>
                        <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.label}
                            className={cn(
                                "rounded-xl py-2.5 h-auto mb-1 group-data-[collapsible=icon]:justify-center transition-all duration-200", 
                                isActive ? sidebarStyles.ITEM_ACTIVE : sidebarStyles.ITEM_DEFAULT
                            )}
                        >
                            <span>
                                {item.icon && <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "opacity-60 group-hover:opacity-100 text-slate-500")} />}
                                <span className="text-sm font-medium ml-3 group-data-[collapsible=icon]:hidden transition-all duration-300">{item.label}</span>
                            </span>
                        </SidebarMenuButton>
                    </Link>

                    {/* Alt Menüler */}
                    {item.subItems && (
                        <SidebarMenuSub className="border-l-slate-200 ml-5 pl-2 my-1 space-y-1 group-data-[collapsible=icon]:hidden">
                            {item.subItems.map(subItem => {
                                const isSubActive = pathname === subItem.href;
                                return (
                                    <SidebarMenuSubItem key={subItem.href}>
                                        <Link href={subItem.href} legacyBehavior={false} passHref>
                                            <SidebarMenuSubButton 
                                                asChild 
                                                isActive={isSubActive}
                                                className={cn(
                                                    "rounded-lg transition-colors h-9",
                                                    isSubActive 
                                                        ? sidebarStyles.SUB_ITEM_ACTIVE 
                                                        : sidebarStyles.SUB_ITEM_DEFAULT
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

      {/* --- FOOTER --- */}
      <SidebarFooter className="border-t border-slate-100 p-4 bg-slate-50/50 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
            <SidebarMenuItem>
                <Link href={profileLink} legacyBehavior={false} passHref>
                    <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith('/profile/')}
                        tooltip="Profilim"
                        className={cn(
                            "rounded-xl h-12 mb-2 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:justify-center border border-transparent", 
                            pathname.startsWith('/profile/') ? sidebarStyles.ITEM_ACTIVE : "hover:bg-white hover:border-slate-200 hover:shadow-sm"
                        )}
                    >
                        <span>
                            <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 p-[1.5px] mr-2 group-data-[collapsible=icon]:mr-0 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 transition-all">
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                    <User className="w-4 h-4 text-slate-600 group-data-[collapsible=icon]:w-3 group-data-[collapsible=icon]:h-3" />
                                </div>
                            </div>
                            <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                                <span className={cn("font-bold text-sm leading-none", pathname.startsWith('/profile/') ? "text-white" : "text-slate-700")}>Profilim</span>
                                <span className={cn("text-[10px] mt-0.5 font-normal", pathname.startsWith('/profile/') ? "text-indigo-100" : "text-slate-400")}>Hesap Ayarları</span>
                            </div>
                        </span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>

            <SidebarMenuItem>
                <SidebarMenuButton 
                    onClick={logout}
                    tooltip="Çıkış Yap"
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl h-10 transition-colors justify-center font-medium group-data-[collapsible=icon]:h-10"
                >
                    <LogOut className="w-4 h-4 mr-2 group-data-[collapsible=icon]:mr-0" />
                    <span className="group-data-[collapsible=icon]:hidden">Çıkış Yap</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail className="hover:after:bg-indigo-500/50" />
    </Sidebar>
  );
}