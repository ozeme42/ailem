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
        "flex flex-col items-start gap-4 p-4",
        "bg-gradient-to-r from-primary to-accent text-primary-foreground"
    )}>
      <div className="w-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        </div>
         <div className="hidden md:flex">
             <Link href="/" className="hidden md:flex">
                <Button variant="secondary">
                    <Home className="mr-2 h-4 w-4" />
                    Ana Sayfa
                </Button>
            </Link>
         </div>
      </div>
      <div className="w-full">
        {children}
      </div>
    </header>
  );
}
