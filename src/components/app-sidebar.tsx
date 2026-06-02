"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, ListTodo, CalendarDays, Library, ChevronsRight, GraduationCap, 
  ShoppingCart, UtensilsCrossed, Target, User, LogOut, 
  CheckCircle, Notebook, Youtube, Columns3, Wallet, Timer, PanelLeft, ScrollText, X 
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
    BASE: "backdrop-blur-2xl border-r border-slate-200 shadow-xl transition-all duration-300",
    HEADER: "border-b border-slate-100 pb-4",
    ITEM_DEFAULT: "text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200",
    ITEM_ACTIVE: "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20 hover:bg-indigo-700",
    ICON_BOX: "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 text-white",
    SUB_ITEM_ACTIVE: "text-indigo-700 font-medium bg-indigo-50 border-l-2 border-indigo-600 pl-2",
    SUB_ITEM_DEFAULT: "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-2 border-transparent pl-2",
    SECTION_LABEL: "text-slate-400 font-bold text-[10px] uppercase tracking-wider px-3 py-2 mt-4 opacity-100 group-data-[collapsible=icon]:hidden transition-all"
};

// Cami İkonu
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
  const { toggleSidebar, state, isMobile, setOpenMobile } = useSidebar(); 
  
  const isCollapsed = state === "collapsed";

  const handleLinkClick = () => {
    if (isMobile) {
        setOpenMobile(false);
    }
  };

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
    { href: "/education/summaries", label: "Özetler", icon: ScrollText },
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
        style={{ "--sidebar-background": "rgba(255, 255, 255, 0.85)" } as React.CSSProperties}
    >
      {isMobile ? (
         <SidebarHeader className="px-5 py-6 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-b-3xl mb-2 relative shadow-lg">
           <button onClick={() => setOpenMobile(false)} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-md transition-all active:scale-90">
               <X className="w-5 h-5 text-white" />
           </button>
           <div className="flex flex-col items-start mt-4">
              <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center backdrop-blur-md mb-3 overflow-hidden shadow-inner">
                 <User className="w-8 h-8 text-white/90" />
              </div>
              <h2 className="text-xl font-black leading-none">{user?.displayName || 'Kullanıcı'}</h2>
              <p className="text-indigo-100 text-xs font-medium mt-1">{user?.email || 'Hoş geldiniz'}</p>
           </div>
         </SidebarHeader>
      ) : (
         <SidebarHeader className={cn("px-4 py-5 h-[72px] flex justify-center", sidebarStyles.HEADER)}>
          <div className="flex items-center w-full justify-between group-data-[collapsible=icon]:justify-center">
              <div className={cn("flex items-center gap-3 transition-all duration-300", isCollapsed ? "hidden w-0 opacity-0" : "flex w-auto opacity-100")}>
                  <div className={cn("p-2 rounded-xl flex items-center justify-center shrink-0", sidebarStyles.ICON_BOX)}>
                      <ChevronsRight className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                      <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100 leading-none whitespace-nowrap">Ailem</h2>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5 whitespace-nowrap">Yönetim Paneli</span>
                  </div>
              </div>
              <Button 
                  onClick={toggleSidebar} 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                      "h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all",
                      isCollapsed && "h-9 w-9 bg-white text-indigo-600 hover:bg-indigo-50 fixed left-4 top-5 z-50 shadow-md border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-slate-800"
                  )}
              >
                  <PanelLeft className="w-5 h-5" />
              </Button>
          </div>
        </SidebarHeader>
      )}

      <SidebarContent className="px-4 py-2 custom-scrollbar">
        <SidebarMenu>
          {menuItems.map((item, index) => {
            if (item.section) {
                return <div key={index} className={cn(sidebarStyles.SECTION_LABEL, "dark:text-slate-500", isMobile ? "mt-6 text-xs" : "")}>{item.section}</div>;
            }

            const isSubItemActive = item.subItems?.some(sub => pathname === sub.href);
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href || '') && !item.subItems) || isSubItemActive;
            
            return (
                <SidebarMenuItem key={item.href}>
                    <Link href={item.href || '#'} passHref onClick={handleLinkClick}>
                        <SidebarMenuButton
                            isActive={isActive}
                            tooltip={item.label}
                            className={cn(
                                "rounded-2xl py-3.5 md:py-2.5 h-auto mb-1.5 md:mb-1 group-data-[collapsible=icon]:justify-center transition-all duration-200", 
                                isActive ? sidebarStyles.ITEM_ACTIVE : cn(sidebarStyles.ITEM_DEFAULT, "dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800", isMobile ? "text-slate-700" : "")
                            )}
                        >
                            {item.icon && <item.icon className={cn("w-6 h-6 md:w-5 md:h-5 shrink-0", isActive ? "text-white" : "opacity-70 group-hover:opacity-100 text-slate-500 dark:text-slate-400")} />}
                            <span className={cn("font-bold md:font-medium ml-3 group-data-[collapsible=icon]:hidden transition-all duration-300", isMobile ? "text-base" : "text-sm")}>{item.label}</span>
                        </SidebarMenuButton>
                    </Link>

                    {item.subItems && (
                        <SidebarMenuSub className="border-l-slate-200 dark:border-l-slate-800 ml-6 md:ml-5 pl-2 my-1 space-y-1 group-data-[collapsible=icon]:hidden">
                            {item.subItems.map(subItem => {
                                const isSubActive = pathname === subItem.href;
                                return (
                                    <SidebarMenuSubItem key={subItem.href}>
                                        <Link href={subItem.href} passHref onClick={handleLinkClick}>
                                            <SidebarMenuSubButton 
                                                isActive={isSubActive}
                                                className={cn(
                                                    "rounded-xl transition-colors h-10 md:h-9",
                                                    isSubActive 
                                                        ? sidebarStyles.SUB_ITEM_ACTIVE 
                                                        : cn(sidebarStyles.SUB_ITEM_DEFAULT, "dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/50 dark:border-transparent")
                                                )}
                                            >
                                                <span className={isMobile ? "text-sm font-semibold" : ""}>{subItem.label}</span>
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

      <SidebarFooter className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
            <SidebarMenuItem>
                <Link href={profileLink} passHref onClick={handleLinkClick}>
                    <SidebarMenuButton
                        isActive={pathname.startsWith('/profile/')}
                        tooltip="Profilim"
                        className={cn(
                            "rounded-2xl md:rounded-xl h-14 md:h-12 mb-2 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:justify-center border border-transparent", 
                            pathname.startsWith('/profile/') ? sidebarStyles.ITEM_ACTIVE : "hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm"
                        )}
                    >
                        <div className="w-10 h-10 md:w-8 md:h-8 shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 p-[1.5px] mr-3 md:mr-2 group-data-[collapsible=icon]:mr-0 transition-all">
                            <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                                <User className="w-5 h-5 md:w-4 md:h-4 text-slate-600 dark:text-slate-300 group-data-[collapsible=icon]:w-3 group-data-[collapsible=icon]:h-3" />
                            </div>
                        </div>
                        <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                            <span className={cn("font-black md:font-bold text-base md:text-sm leading-none", pathname.startsWith('/profile/') ? "text-white" : "text-slate-700 dark:text-slate-200")}>Profilim</span>
                            <span className={cn("text-[11px] md:text-[10px] mt-0.5 font-normal", pathname.startsWith('/profile/') ? "text-indigo-100" : "text-slate-400 dark:text-slate-500")}>Hesap Ayarları</span>
                        </div>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton 
                    onClick={() => { logout(); handleLinkClick(); }}
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl md:rounded-xl h-12 md:h-10 transition-colors justify-center font-bold"
                >
                    <LogOut className="w-5 h-5 md:w-4 md:h-4 mr-2 group-data-[collapsible=icon]:mr-0" />
                    <span className="group-data-[collapsible=icon]:hidden">Çıkış Yap</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail className="hover:after:bg-indigo-500/50 dark:hover:after:bg-indigo-500/50" />
    </Sidebar>
  );
}
