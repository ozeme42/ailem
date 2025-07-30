import * as React from "react";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4",
        "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg",
        // Mobile: Full-width, top/sides flush, margin bottom.
        "-m-4 mb-4",
        // SM and up: Restore margins and add rounded corners.
        "sm:m-0 sm:mb-8 sm:rounded-xl"
    )}>
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-primary-foreground hover:bg-white/20" />
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4 self-end sm:self-center">
        <Link href="/" className="hidden md:flex">
            <Button variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Ana Sayfa
            </Button>
        </Link>
        {children}
      </div>
    </header>
  );
}
