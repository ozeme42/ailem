
import { Suspense } from 'react';
import NotebookClient from './notebook-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function NotebookDetailPage() {
  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      <Suspense fallback={<NotebookSkeleton />}>
        <NotebookClient />
      </Suspense>
    </div>
  );
}


function NotebookSkeleton() {
  return (
    <>
      <PageHeader title="Yükleniyor...">
          <Skeleton className="h-10 w-24" />
       </PageHeader>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </>
  );
}
