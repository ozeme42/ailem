import { Suspense } from 'react';
import { TrackingClient } from './tracking-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

export default function TrackingPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<TrackingSkeleton />}>
        <TrackingClient />
      </Suspense>
    </div>
  );
}

function TrackingSkeleton() {
  return (
    <div className="space-y-6">
       <PageHeader title="Takip Tablosu Yükleniyor...">
          <Skeleton className="h-10 w-48" />
       </PageHeader>
        <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-[500px] w-full" />
    </div>
  );
}
