import * as React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden"/>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4 self-end sm:self-center">{children}</div>
    </header>
  );
}
