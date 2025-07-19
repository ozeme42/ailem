import * as React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden"/>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-4">{children}</div>
    </header>
  );
}
