import { ArchiveClient } from './archive-client';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';

export default function ArchivePage() {
  return (
    <div className="h-full">
      <Suspense fallback={<ArchiveSkeleton />}>
        <ArchiveClient />
      </Suspense>
    </div>
  );
}


function ArchiveSkeleton() {
  return (
    <div className="space-y-6">
       <PageHeader title="Kitaplığımız">
          <Skeleton className="h-10 w-48" />
       </PageHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
    </div>
  );
}