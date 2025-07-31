
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, CheckCircle2, Calendar, BookOpen, Target, Zap, Notebook } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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
            <line x1="8" y1="30" x2="14" y2="30"/>
            <line x1="8" y1="38" x2="14" y2="38"/>
            <line x1="8" y1="46" x2="14" y2="46"/>

            <rect x="50" y="20" width="6" height="30" fill="currentColor" />
            <polygon points="50,20 53,10 56,20" fill="currentColor" />
            <line x1="50" y1="30" x2="56" y2="30"/>
            <line x1="50" y1="38" x2="56" y2="38"/>
            <line x1="50" y1="46" x2="56" y2="46"/>

            <rect x="20" y="30" width="24" height="20" fill="currentColor" />
            <path d="M20 30 Q32 15 44 30" fill="currentColor" stroke="currentColor" />

            <rect x="30" y="40" width="4" height="10" fill="hsl(var(--background))" stroke="none"/>
        </g>
    </svg>
);

const menuItems = [
  { href: "/", label: "Ailem", icon: Users },
  { href: "/tasks", label: "Görevler", icon: CheckCircle2 },
  { href: "/habits", label: "Alışkanlıklar", icon: Zap },
  { href: "/prayers", label: "Namaz", icon: MosqueIcon },
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
