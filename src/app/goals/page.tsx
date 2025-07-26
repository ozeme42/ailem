
import { Suspense } from 'react';
import GoalsClient from './goals-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

export default function GoalsPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<GoalsSkeleton />}>
        <GoalsClient />
      </Suspense>
    </div>
  );
}


function GoalsSkeleton() {
  return (
    <div className="space-y-6">
       <PageHeader title="Yol Haritaları">
          <Skeleton className="h-10 w-32" />
       </PageHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
    </div>
  );
}
