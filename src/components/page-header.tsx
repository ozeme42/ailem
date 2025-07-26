import * as React from "react";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { Home } from "lucide-react";

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
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
