import { Suspense } from 'react';
import { BooksClient } from './books-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

export default function BookTrackingPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<BooksSkeleton />}>
        <BooksClient />
      </Suspense>
    </div>
  );
}

function BooksSkeleton() {
  return (
    <div className="space-y-6">
       <PageHeader title="Kitap Takibi">
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
