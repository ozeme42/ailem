
import * as React from "react";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, children, className }: PageHeaderProps) {
  return (
    <header className={cn(
        "flex items-center justify-center p-6 py-8 relative", // Changed to items-center for vertical centering
        "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg",
        "-mx-4 -mt-4 sm:-mx-6 sm:-mt-8 mb-6", // Full-bleed on mobile
        "rounded-b-2xl",
        className
    )}>
      <div className="absolute top-6 left-4">
        <SidebarTrigger />
      </div>
      <div className="absolute top-6 right-4 hidden md:flex">
         <Link href="/" className="hidden md:flex">
            <Button variant="secondary">
                <Home className="mr-2 h-4 w-4" />
                Ana Sayfa
            </Button>
        </Link>
      </div>
      
      <div className="flex flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-3xl font-extrabold tracking-tighter" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.2)'}}>{title}</h1>
          
          <div className="w-full max-w-2xl">
            {children}
          </div>
      </div>
    </header>
  );
}
