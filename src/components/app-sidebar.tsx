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

// --- DESIGN SYSTEM: FORCED DARK THEME ---
// Not: Shadcn varsayılanlarını ezmek için '!' işaretini (important) ve text renklerini spesifik kullandık.
const sidebarStyles = {
    // !bg-slate-950 ile light modu eziyoruz.
    BASE: "!bg-slate-950 border-r border-white/10 text-slate-200 transition-all duration-300",
    HEADER: "border-b border-white/10 pb-4",
    
    // Buton stilleri
    ITEM_DEFAULT: "text-slate-400 hover:text-white hover:bg-white/10 data-[active=true]:bg-indigo-600 data-[active=true]:text-white transition-all duration-200",
    ITEM_ACTIVE: "!bg-indigo-600 !text-white font-bold shadow-lg shadow-indigo-500/20 hover:!bg-indigo-500",
    
    // İkon kutusu
    ICON_BOX: "bg-gradient-to-br from-indigo-600 to-violet-700 shadow-lg shadow-indigo-500/20",
    
    // Alt menü stilleri
    SUB_ITEM_DEFAULT: "text-slate-500 hover:text-slate-200 hover:bg-white/5",
    SUB_ITEM_ACTIVE: "text-indigo-300 font-medium bg-indigo-500/10 border-l-2 border-indigo-500 pl-2",
    
    // Bölüm Başlığı
    SECTION_LABEL: "text-slate-600 font-bold text-[10px] uppercase tracking-wider px-3 py-2 mt-4 group-data-[collapsible=icon]:hidden transition-all"
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
    <Sidebar collapsible="icon" className={cn("border-r-0 shadow-2xl group", sidebarStyles.BASE)}>
      
      {/* --- HEADER --- */}
      <SidebarHeader className={cn("px-4 py-5 h-[72px] flex justify-center", sidebarStyles.HEADER)}>
        <div className="flex items-center w-full justify-between group-data-[collapsible=icon]:justify-center">
            
            {/* LOGO ALANI (Sadece açıkken görünür) */}
            <div className={cn("flex items-center gap-3 transition-all duration-200", isCollapsed ? "hidden w-0 opacity-0" : "flex w-auto opacity-100")}>
                <div className={cn("p-2 rounded-xl flex items-center justify-center shrink-0", sidebarStyles.ICON_BOX)}>
                    <ChevronsRight className="text-white w-5 h-5" />
                </div>
                <div className="flex flex-col overflow-hidden">
                    <h2 className="text-lg font-black tracking-tight text-slate-100 leading-none whitespace-nowrap">
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
                    "h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all",
                    isCollapsed && "h-10 w-10 bg-white/5 text-white hover:bg-indigo-600 fixed left-3 top-4 z-50 shadow-lg" // Kapalıyken sabit ve belirgin
                )}
            >
                {isCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
                <span className="sr-only">Menüyü Aç/Kapat</span>
            </Button>
        </div>
      </SidebarHeader>

      {/* --- CONTENT --- */}
      <SidebarContent className="px-3 py-4 custom-scrollbar">
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
                                "rounded-xl py-2.5 h-auto mb-1 group-data-[collapsible=icon]:justify-center transition-all duration-200", 
                                isActive ? sidebarStyles.ITEM_ACTIVE : sidebarStyles.ITEM_DEFAULT
                            )}
                        >
                            <span>
                                {item.icon && <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "opacity-60 group-hover:opacity-100")} />}
                                <span className="text-sm font-medium ml-3 group-data-[collapsible=icon]:hidden transition-all duration-300">{item.label}</span>
                            </span>
                        </SidebarMenuButton>
                    </Link>

                    {/* Alt Menüler (Sadece açıkken görünür) */}
                    {item.subItems && (
                        <SidebarMenuSub className="border-l-white/10 ml-5 pl-2 my-1 space-y-1 group-data-[collapsible=icon]:hidden">
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
      <SidebarFooter className="border-t border-white/5 p-4 bg-black/20 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
            {/* Profil Linki */}
            <SidebarMenuItem>
                <Link href={profileLink} legacyBehavior={false} passHref>
                    <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith('/profile/')}
                        tooltip="Profilim"
                        className={cn(
                            "rounded-xl h-12 mb-2 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:justify-center", 
                            pathname.startsWith('/profile/') ? sidebarStyles.ITEM_ACTIVE : sidebarStyles.ITEM_DEFAULT
                        )}
                    >
                        <span>
                            <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 p-[1.5px] mr-2 group-data-[collapsible=icon]:mr-0 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 transition-all">
                                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                                    <User className="w-4 h-4 text-slate-300 group-data-[collapsible=icon]:w-3 group-data-[collapsible=icon]:h-3" />
                                </div>
                            </div>
                            <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                                <span className="font-bold text-sm leading-none text-slate-200">Profilim</span>
                                <span className="text-[10px] opacity-60 mt-0.5 font-normal text-slate-400">Hesap Ayarları</span>
                            </div>
                        </span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>

            {/* Çıkış Yap */}
            <SidebarMenuItem>
                <SidebarMenuButton 
                    onClick={logout}
                    tooltip="Çıkış Yap"
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl h-10 transition-colors justify-center font-medium group-data-[collapsible=icon]:h-10"
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