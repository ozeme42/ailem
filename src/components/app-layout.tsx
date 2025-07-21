
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { MobileNavbar } from '@/components/mobile-navbar';
import { Skeleton } from './ui/skeleton';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const authRoutes = ['/login', '/signup'];
  const isAuthRoute = authRoutes.includes(pathname);
  
  React.useEffect(() => {
    if (!loading && !user && !isAuthRoute) {
      router.push('/login');
    }
    if (!loading && user && isAuthRoute) {
      router.push('/');
    }
  }, [user, loading, isAuthRoute, router]);

  if ((loading && !isAuthRoute) || (!user && !isAuthRoute)) {
     return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-2xl font-bold text-primary">Ailem</p>
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
     )
  }

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 h-full">
          {children}
        </main>
      </SidebarInset>
      <MobileNavbar />
    </SidebarProvider>
  );
}
