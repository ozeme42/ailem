import { Suspense } from 'react';
import { VideosClient } from './videos-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

export default function VideosPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<VideosSkeleton />}>
        <VideosClient />
      </Suspense>
    </div>
  );
}

function VideosSkeleton() {
  return (
    <div className="space-y-6">
       <PageHeader title="Video Dersler">
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
