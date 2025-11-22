
import { Suspense } from 'react';
import StatsClient from './stats-client';
import { PageHeader } from '@/components/page-header';
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
       <PageHeader title="İstatistikler 📈">
          <Skeleton className="h-10 w-32" />
       </PageHeader>
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

