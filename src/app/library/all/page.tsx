
import { Suspense } from 'react';
import { AllBooksClient } from './all-books-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

export default function AllBooksPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<AllBooksSkeleton />}>
        <AllBooksClient />
      </Suspense>
    </div>
  );
}


function AllBooksSkeleton() {
  return (
    <div className="space-y-6">
       <PageHeader title="Tüm Kitaplar">
          <Skeleton className="h-10 w-32" />
       </PageHeader>
        <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-[500px] w-full" />
    </div>
  );
}
