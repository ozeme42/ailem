

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, CheckCircle2, Calendar, BookOpen, Target, Zap, Notebook, GraduationCap, BrainCircuit } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/", label: "Ailem", icon: Users },
  { href: "/tasks", label: "Görevler", icon: CheckCircle2 },
  { href: "/education", label: "Eğitim", icon: GraduationCap },
  { href: "/library", label: "Kütüphane", icon: BookOpen },
];

export function MobileNavbar() {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  if (!isMobile) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-sm border-t border-border/60 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] rounded-t-2xl z-50">
      <div className="flex justify-around items-center h-full px-2 pb-safe">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="flex-1 flex justify-center">
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-lg transition-all duration-300 text-muted-foreground",
                  isActive && "text-primary-foreground"
                )}
              >
                <div className={cn(
                  "w-12 h-8 flex items-center justify-center rounded-lg transition-all duration-300 relative",
                   isActive && "bg-primary shadow-lg -translate-y-2"
                )}>
                    <item.icon className="h-5 w-5" />
                </div>
                <span className={cn(
                    "text-xs font-medium transition-opacity duration-300",
                    isActive && "opacity-0 -translate-y-2"
                    )}>
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
