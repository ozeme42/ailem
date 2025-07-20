import ShoppingListClient from './shopping-list-client';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';

export default function ShoppingListPage() {
  return (
    <>
      <Suspense fallback={
        <div className="space-y-6">
          <div className='flex justify-between items-center mb-8'>
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-36" />
          </div>
          <div className="space-y-4 mt-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      }>
        <ShoppingListClient />
      </Suspense>
    </>
  );
}
