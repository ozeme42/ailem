
import { Suspense } from 'react';
import { StatsClient } from './stats-client';
import { Skeleton } from '@/components/ui/skeleton';

export default function EducationStatsPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<StatsSkeleton />}>
        <StatsClient />
      </Suspense>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <div className="h-20 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 animate-pulse" />
        <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
            </div>
            <Skeleton className="h-80 w-full rounded-3xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-64 w-full rounded-3xl" />
                <Skeleton className="h-64 w-full rounded-3xl" />
            </div>
        </div>
    </div>
  );
}
