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
    <div className="space-y-6">
        <div className="h-20 w-full rounded-2xl bg-white dark:bg-slate-900 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
    </div>
  );
}
