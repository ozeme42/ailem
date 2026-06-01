"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, ShoppingCart, GraduationCap, Wallet, Library } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Renk konfigürasyonunu daha yumuşak (pastel/light) tonlara göre güncelledik
const navConfig = [
  { 
    href: "/", 
    label: "Ailem", 
    icon: Users,
    // Aktif olduğunda kullanılacak arka plan ve ikon renkleri (Dark mode dahil)
    activeBg: "bg-indigo-50 dark:bg-indigo-500/20", 
    activeText: "text-indigo-600 dark:text-indigo-400"
  },
  { 
    href: "/education", 
    label: "Eğitim", 
    icon: GraduationCap,
    activeBg: "bg-blue-50 dark:bg-blue-500/20",
    activeText: "text-blue-600 dark:text-blue-400"
  },
  { 
    href: "/library", 
    label: "Kitaplık", 
    icon: Library,
    activeBg: "bg-amber-50 dark:bg-amber-500/20",
    activeText: "text-amber-600 dark:text-amber-400"
  },
  { 
    href: "/shopping", 
    label: "Alışveriş", 
    icon: ShoppingCart,
    activeBg: "bg-emerald-50 dark:bg-emerald-500/20",
    activeText: "text-emerald-600 dark:text-emerald-400"
  },
  { 
    href: "/budget", 
    label: "Bütçe", 
    icon: Wallet,
    activeBg: "bg-rose-50 dark:bg-rose-500/20",
    activeText: "text-rose-600 dark:text-rose-400"
  },
];

export function MobileNavbar() {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // Pomodoro sayfasında veya masaüstünde gösterme
  if (!isMobile || pathname.startsWith('/pomodoro')) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* ARKA PLAN: Dark mode için dark:bg-slate-950/90 ve dark:border-slate-800 eklendi */}
      <div className="absolute inset-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)] pb-[env(safe-area-inset-bottom)]"></div>
      
      {/* İÇERİK KONTEYNERİ: Yüksekliği azalttık (h-16) */}
      <div className="relative flex justify-around items-center h-16 px-1 pb-[env(safe-area-inset-bottom)]">
        {navConfig.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className="flex-1 flex justify-center items-center h-full cursor-pointer select-none touch-manipulation"
            >
              <div 
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-300",
                  // Aktif ise arka plan rengini ver, değilse şeffaf
                  isActive ? item.activeBg : "bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                {/* İkon */}
                <item.icon 
                  className={cn(
                    "w-5 h-5 transition-colors duration-300",
                    // Aktif ise özel rengini al, değilse gri
                    isActive ? item.activeText : "text-slate-400 dark:text-slate-500"
                  )} 
                  strokeWidth={isActive ? 2.5 : 2} // Aktifken biraz daha kalın
                />
                
                {/* Etiket */}
                <span 
                  className={cn(
                    "text-[10px] font-semibold transition-colors duration-300",
                    isActive ? item.activeText : "text-slate-400 dark:text-slate-500"
                  )}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}