
import { Suspense } from 'react';
import NotebookClient from './notebook-client';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';

export default function NotebookDetailPage() {
  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      <Suspense fallback={<NotebookSkeleton />}>
        <NotebookClient />
      </Suspense>
    </div>
  );
}


function NotebookSkeleton() {
  return (
    <div className="flex h-screen w-full">
        {/* Left Sidebar Skeleton */}
        <div className="w-72 border-r p-4 space-y-4 hidden md:flex flex-col">
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2 pt-4">
                 <Skeleton className="h-20 w-full" />
                 <Skeleton className="h-20 w-full" />
                 <Skeleton className="h-20 w-full" />
            </div>
        </div>

        {/* Right Content Skeleton */}
        <div className="flex-1 flex flex-col">
            <div className="h-16 border-b px-6 flex items-center justify-between">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-9 w-32" />
            </div>
            <div className="flex-1 p-6 space-y-6">
                <Skeleton className="h-12 w-full max-w-lg" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} className="h-52 w-full" />
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
}
