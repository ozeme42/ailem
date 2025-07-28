
import { Suspense } from 'react';
import PagesClient from './pages-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function PagesStatsPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PagesStatsSkeleton />}>
        <PagesClient />
      </Suspense>
    </div>
  );
}


function PagesStatsSkeleton() {
    return (
        <div className="space-y-6">
            <PageHeader title="Sayfa Sayısı Sıralaması">
                <Skeleton className="h-10 w-28" />
            </PageHeader>
            <div className="flex justify-end gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
            </div>
            <Card>
                <CardContent className="p-4 space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </CardContent>
            </Card>
        </div>
    )
}
