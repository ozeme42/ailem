"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, ShoppingCart, GraduationCap, Wallet, Library } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Her menü öğesi için özel renk temaları
const navConfig = [
  { 
    href: "/", 
    label: "Ailem", 
    icon: Users,
    color: "from-indigo-500 to-purple-500",
    shadow: "shadow-indigo-500/50",
    textColor: "text-indigo-400"
  },
  { 
    href: "/education", 
    label: "Eğitim", 
    icon: GraduationCap,
    color: "from-blue-500 to-cyan-500",
    shadow: "shadow-blue-500/50",
    textColor: "text-blue-400"
  },
  { 
    href: "/library", 
    label: "Kitaplık", 
    icon: Library,
    color: "from-amber-500 to-orange-500",
    shadow: "shadow-amber-500/50",
    textColor: "text-amber-400"
  },
  { 
    href: "/shopping", 
    label: "Alışveriş", 
    icon: ShoppingCart,
    color: "from-emerald-500 to-teal-500",
    shadow: "shadow-emerald-500/50",
    textColor: "text-emerald-400"
  },
  { 
    href: "/budget", 
    label: "Bütçe", 
    icon: Wallet,
    color: "from-rose-500 to-pink-500",
    shadow: "shadow-rose-500/50",
    textColor: "text-rose-400"
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      {/* Arka plan blur ve gradient çizgisi */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl border-t border-white/10 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.4)]"></div>
      
      <div className="relative flex justify-around items-center h-20 px-2">
        {navConfig.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href} className="group flex-1 flex flex-col items-center justify-end h-full pb-3 cursor-pointer select-none touch-manipulation">
              <div className="relative flex flex-col items-center justify-center w-full">
                
                {/* İkon Kutusu - Aktifken yukarı çıkar ve parlar */}
                <div 
                  className={cn(
                    "flex items-center justify-center rounded-2xl transition-all duration-500 ease-out",
                    isActive 
                      ? cn("w-12 h-12 -translate-y-5 bg-gradient-to-br shadow-lg border border-white/20", item.color, item.shadow)
                      : "w-10 h-10 bg-transparent text-slate-500 group-hover:text-slate-300"
                  )}
                >
                  <item.icon 
                    className={cn(
                      "transition-all duration-300",
                      isActive ? "w-6 h-6 text-white" : "w-6 h-6"
                    )} 
                  />
                  
                  {/* Aktif İkonun Altındaki Küçük Işık Hüzmesi */}
                  {isActive && (
                     <div className={cn("absolute -bottom-2 w-8 h-8 rounded-full blur-xl opacity-60 -z-10", item.color)}></div>
                  )}
                </div>

                {/* Etiket Metni */}
                <span 
                  className={cn(
                    "text-[10px] font-bold tracking-wide transition-all duration-300 absolute bottom-0 translate-y-full",
                    isActive 
                      ? cn("opacity-100 translate-y-1", item.textColor)
                      : "opacity-60 text-slate-500 translate-y-0 group-hover:text-slate-400"
                  )}
                >
                  {item.label}
                </span>

                {/* Aktif Gösterge Noktası (Opsiyonel, metin yerine nokta istenirse) */}
                {/* {isActive && <div className={cn("mt-1 w-1 h-1 rounded-full bg-current", item.textColor)} />} */}
              
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}