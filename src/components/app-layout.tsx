
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
  const { user, familyId, loading } = useAuth();

  const authRoutes = ['/login', '/signup'];
  const isAuthRoute = authRoutes.includes(pathname);
  const isJoinFamilyRoute = pathname === '/join-family';
  
  React.useEffect(() => {
    if (loading) return;

    if (!user && !isAuthRoute) {
      router.push('/login');
    } else if (user && isAuthRoute) {
      router.push('/');
    } else if (user && !familyId && !isJoinFamilyRoute) {
      router.push('/join-family');
    } else if (user && familyId && isJoinFamilyRoute) {
       router.push('/');
    }
  }, [user, familyId, loading, isAuthRoute, isJoinFamilyRoute, router]);

  if (loading || (!user && !isAuthRoute) || (user && !familyId && !isJoinFamilyRoute)) {
     return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-2xl font-bold text-primary">Ailem</p>
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
     )
  }

  if (isAuthRoute || isJoinFamilyRoute) {
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
