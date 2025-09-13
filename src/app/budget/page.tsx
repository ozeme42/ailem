
import { Suspense } from 'react';
import { BudgetClient } from './budget-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

export default function BudgetPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<BudgetSkeleton />}>
        <BudgetClient />
      </Suspense>
    </div>
  );
}

function BudgetSkeleton() {
  return (
    <div className="space-y-6">
       <PageHeader title="Bütçe Yönetimi">
          <Skeleton className="h-10 w-48" />
       </PageHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
    </div>
  );
}
