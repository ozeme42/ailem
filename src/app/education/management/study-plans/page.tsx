
import { Suspense } from 'react';
import { StudyPlansClient } from './study-plans-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudyPlansPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<StudyPlansSkeleton />}>
        <StudyPlansClient />
      </Suspense>
    </div>
  );
}

function StudyPlansSkeleton() {
  return (
    <div className="space-y-6">
       <PageHeader title="Konu Anlatım Planları">
            <div className="flex gap-2">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-44" />
            </div>
       </PageHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
        </div>
    </div>
  );
}
