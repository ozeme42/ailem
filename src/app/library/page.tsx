
import BooksClient from './books-client';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';

export default function LibraryPage() {
  return (
    <Suspense fallback={<LibrarySkeleton />}>
      <BooksClient />
    </Suspense>
  );
}

function LibrarySkeleton() {
  return (
    <>
      <PageHeader title="Aile Kütüphanesi 📚">
        <Skeleton className="h-10 w-36" />
      </PageHeader>
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Skeleton className="h-[320px] w-full" />
        <Skeleton className="h-[320px] w-full" />
      </div>
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <h2 className="text-2xl font-semibold text-foreground">Kitap Listesi</h2>
             <Skeleton className="h-10 w-full sm:w-auto md:w-1/3" />
        </div>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i}>
              <Skeleton className="w-full h-auto aspect-[2/3]" />
              <Skeleton className="h-4 w-3/4 mt-2" />
              <Skeleton className="h-3 w-1/2 mt-1" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
