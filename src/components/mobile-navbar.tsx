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
    // Aktif olduğunda kullanılacak arka plan ve ikon renkleri
    activeBg: "bg-indigo-50", 
    activeText: "text-indigo-600"
  },
  { 
    href: "/education", 
    label: "Eğitim", 
    icon: GraduationCap,
    activeBg: "bg-blue-50",
    activeText: "text-blue-600"
  },
  { 
    href: "/library", 
    label: "Kitaplık", 
    icon: Library,
    activeBg: "bg-amber-50",
    activeText: "text-amber-600"
  },
  { 
    href: "/shopping", 
    label: "Alışveriş", 
    icon: ShoppingCart,
    activeBg: "bg-emerald-50",
    activeText: "text-emerald-600"
  },
  { 
    href: "/budget", 
    label: "Bütçe", 
    icon: Wallet,
    activeBg: "bg-rose-50",
    activeText: "text-rose-600"
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
      {/* ARKA PLAN:
         - bg-white/80: Hafif şeffaf beyaz (Ne koyu, ne çok parlak)
         - backdrop-blur-md: Arkadaki içeriği buzlu gösterir (Şıklık katar)
         - border-t: Üstte çok ince bir çizgi ile içeriği ayırır
      */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-[env(safe-area-inset-bottom)]"></div>
      
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
                  isActive ? item.activeBg : "bg-transparent hover:bg-slate-50"
                )}
              >
                {/* İkon */}
                <item.icon 
                  className={cn(
                    "w-5 h-5 transition-colors duration-300",
                    // Aktif ise özel rengini al, değilse gri (slate-400)
                    isActive ? item.activeText : "text-slate-400"
                  )} 
                  strokeWidth={isActive ? 2.5 : 2} // Aktifken biraz daha kalın
                />
                
                {/* Etiket */}
                <span 
                  className={cn(
                    "text-[10px] font-semibold transition-colors duration-300",
                    isActive ? item.activeText : "text-slate-400"
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